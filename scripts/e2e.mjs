import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

const mode = process.argv[2];
if (!["dev", "preview", "test"].includes(mode)) throw new Error("Expected dev, preview, or test");
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key !== "PORTLESS" && !key.startsWith("PORTLESS_")),
);
let port = mode === "dev" ? 1355 : 1356;
if (mode === "test") {
  const reservation = createServer().listen(0, "127.0.0.1");
  await once(reservation, "listening");
  port = reservation.address().port;
  await new Promise((done) => reservation.close(done));
}
Object.assign(env, {
  PORTLESS_PORT: String(port),
  PORTLESS_HTTPS: "0",
  PORTLESS_SYNC_HOSTS: "0",
  PORTLESS_LAN: "0",
  PORTLESS_TLD: "localhost",
  PORTLESS_STATE_DIR: resolve(".portless", mode === "test" ? `test-${process.pid}` : mode),
  CI: "1",
});
const children = [];
function start(command, args, stdout = "inherit") {
  const child = spawn(command, args, { env, stdio: ["ignore", stdout, "inherit"] });
  child.done = once(child, "exit");
  children.push(child);
  return child;
}
let stopping = false;
function stop() {
  stopping = true;
  children.at(-1)?.kill("SIGINT");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  const migration = start("pnpm", [
    "exec",
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
  ]);
  const [migrationCode] = await migration.done;
  if (migrationCode !== 0) throw new Error("Local D1 migration failed");

  const proxy = start(
    "portless",
    ["proxy", "start", "--foreground", "--port", String(port)],
    "pipe",
  );
  const ready = (async () => {
    for await (const line of createInterface({ input: proxy.stdout })) {
      console.log(line);
      if (line.includes(`HTTP proxy listening on 127.0.0.1:${port}`)) return;
    }
    throw new Error("Owned proxy exited before readiness; existing listeners are never reused");
  })();
  await ready;
  proxy.stdout.pipe(process.stdout);
  if (!stopping) {
    const command =
      mode === "test"
        ? ["playwright", "test"]
        : ["vite", ...(mode === "preview" ? ["preview"] : [])];
    const app = start("portless", [`la-cuenta-pendiente-${mode}`, ...command]);
    const [code] = await Promise.race([
      app.done,
      proxy.done.then(() => {
        throw new Error("Owned proxy stopped unexpectedly");
      }),
    ]);
    process.exitCode = code ?? 1;
  }
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGINT");
    await child.done.catch(() => {});
  }
}
