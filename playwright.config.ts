import { defineConfig } from "@playwright/test";

if (!process.env.PORTLESS_URL || !process.env.PORT || !process.env.PORTLESS_PORT) {
  throw new Error("Run pnpm test:e2e so Portless owns the isolated test route");
}
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.PORTLESS_URL,
    browserName: "chromium",
  },
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${process.env.PORT} --strictPort`,
    url: `http://127.0.0.1:${process.env.PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
