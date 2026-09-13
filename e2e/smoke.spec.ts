import { test as base, expect } from "@playwright/test";

const test = base.extend({
  request: async ({ playwright, baseURL }, use) => {
    const url = new URL(baseURL ?? "");
    // Node does not resolve .localhost subdomains; preserve routing through the proxy.
    const request = await playwright.request.newContext({
      baseURL: `http://127.0.0.1:${url.port}`,
      extraHTTPHeaders: { Host: url.host },
    });
    await use(request);
    await request.dispose();
  },
});

test("local landing and SPA routes remain readable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const path of ["/", "/future-page"]) {
    await page.goto(path);
    expect(new URL(page.url()).hostname).toBe("la-cuenta-pendiente-test.localhost");
    await expect(
      page.getByRole("heading", { name: "La Cuenta Pendiente", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Los reclamos de la ciudad, en un solo mapa.")).toBeVisible();
    await expect(page.getByText("En desarrollo · Solo demostración local")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("heading words stay intact with enlarged text at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // Root-font scaling exercises text reflow, not browser zoom.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const heading = page.getByRole("heading", { name: "La Cuenta Pendiente", exact: true });
  await expect(heading).toBeVisible();
  await expect(page.getByText("Los reclamos de la ciudad, en un solo mapa.")).toBeVisible();
  await expect(page.getByText("En desarrollo · Solo demostración local")).toBeVisible();
  const wordLines = await heading.evaluate((element) => {
    const text = element.firstChild;
    if (!text) throw new Error("Heading text is missing");
    const start = text.textContent?.indexOf("Pendiente") ?? -1;
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, start + "Pendiente".length);
    return new Set(Array.from(range.getClientRects(), (rect) => rect.top)).size;
  });
  expect(wordLines, "Pendiente should occupy one line without splitting inside the word").toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("real Worker serves health and rejects methods", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  const rejected = await request.post("/api/health");
  expect(rejected.status()).toBe(405);
  expect(rejected.headers().allow).toBe("GET");
});

test("private intake retry returns one Pending receipt through local storage", async ({
  request,
}) => {
  const idempotencyKey = crypto.randomUUID();
  const multipart = () => ({
    idempotencyKey,
    longitude: "-62.078",
    latitude: "-38.875",
    locationConfirmed: "true",
    description: "Synthetic pothole",
    photo: {
      name: "synthetic.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    },
  });

  const first = await request.post("/api/complaints", { multipart: multipart() });
  expect(first.status()).toBe(201);
  const receipt = await first.json();
  expect(receipt).toEqual({ complaintId: expect.any(String), status: "Pending" });

  const retry = await request.post("/api/complaints", { multipart: multipart() });
  expect(retry.status()).toBe(200);
  expect(await retry.json()).toEqual(receipt);
});

test("unknown API paths never become SPA HTML, including navigations", async ({
  request,
  page,
}) => {
  for (const path of ["/api", "/api/missing", "/api/health/"]) {
    const api = await request.get(path);
    expect(api.status()).toBe(404);
    expect(api.headers()["content-type"]).toContain("application/json");
    expect(await api.json()).toEqual({ error: "Not found" });
    const navigation = await page.goto(path);
    expect(navigation?.status()).toBe(404);
    expect(navigation?.headers()["content-type"]).toContain("application/json");
    expect(await navigation?.json()).toEqual({ error: "Not found" });
  }
});
