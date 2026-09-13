import { expect, test } from "vitest";
import worker from "../worker/index";

test("GET health reports process liveness", async () => {
  const response = worker.fetch(new Request("http://localhost/api/health"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test.each(["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])(
  "%s health rejects unsupported methods",
  async (method) => {
    const response = worker.fetch(new Request("http://localhost/api/health", { method }));
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  },
);

test.each(["/api", "/api/missing", "/api/health/", "/api/health/nested"])(
  "%s returns JSON not found",
  async (path) => {
    const response = worker.fetch(new Request(`http://localhost${path}`));
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "Not found" });
  },
);
