import type { APIRequestContext } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

const osmTileHost = "tile.openstreetmap.org";

function isOpenStreetMapHost(host: string) {
  const normalizedHost = host.replace(/\.+$/, "");
  return normalizedHost === "openstreetmap.org" || normalizedHost.endsWith(".openstreetmap.org");
}

function assertNoOpenStreetMapApiUrl(url: string) {
  if (isOpenStreetMapHost(new URL(url, "http://local-e2e.test").hostname)) {
    throw new Error(`OSM URL is forbidden in the local E2E API harness: ${url}`);
  }
}

async function getFromLocalHarness(request: APIRequestContext, url: string) {
  assertNoOpenStreetMapApiUrl(url);
  return request.get(url);
}

async function postToLocalHarness(
  request: APIRequestContext,
  url: string,
  options?: Parameters<APIRequestContext["post"]>[1],
) {
  assertNoOpenStreetMapApiUrl(url);
  return request.post(url, options);
}

const localOsmTile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0eQAAAABJRU5ErkJggg==",
  "base64",
);

type LocalOsmTraffic = {
  deniedRequests: string[];
  interceptedTiles: number;
};

type MultipartSubmission = {
  fields: Record<string, string>;
  filename: string | undefined;
  photo: Buffer;
};

function multipartSubmission(request: import("@playwright/test").Request): MultipartSubmission {
  const contentType = request.headers()["content-type"];
  const boundary =
    contentType?.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.[1] ??
    contentType?.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.[2];
  const body = request.postDataBuffer();
  if (!boundary || !body) throw new Error("Expected a multipart complaint request");

  const fields: Record<string, string> = {};
  let filename: string | undefined;
  let photo = Buffer.alloc(0);
  for (const part of body.toString("latin1").split(`--${boundary}`).slice(1, -1)) {
    const separator = part.indexOf("\r\n\r\n");
    const name = part.match(/name="([^"]+)"/)?.[1];
    if (separator === -1 || !name) continue;
    const value = Buffer.from(part.slice(separator + 4, -2), "latin1");
    const partFilename = part.match(/filename="([^"]+)"/)?.[1];
    if (partFilename) {
      filename = partFilename;
      photo = value;
    } else {
      fields[name] = value.toString();
    }
  }
  return { fields, filename, photo };
}

const test = base.extend<{
  request: APIRequestContext;
  localOsmTraffic: LocalOsmTraffic;
}>({
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
  localOsmTraffic: [
    async ({ page }, use) => {
      const traffic: LocalOsmTraffic = { deniedRequests: [], interceptedTiles: 0 };
      await page.context().route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === osmTileHost) {
          traffic.interceptedTiles += 1;
          await route.fulfill({ body: localOsmTile, contentType: "image/png" });
        } else if (isOpenStreetMapHost(url.hostname)) {
          traffic.deniedRequests.push(url.href);
          await route.abort();
        } else {
          await route.continue();
        }
      });

      await use(traffic);
    },
    { auto: true },
  ],
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
  const health = await getFromLocalHarness(request, "/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  const rejected = await postToLocalHarness(request, "/api/health");
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

  const first = await postToLocalHarness(request, "/api/complaints", {
    multipart: multipart(),
  });
  expect(first.status()).toBe(201);
  const receipt = await first.json();
  expect(receipt).toEqual({ complaintId: expect.any(String), status: "Pending" });

  const retry = await postToLocalHarness(request, "/api/complaints", {
    multipart: multipart(),
  });
  expect(retry.status()).toBe(200);
  expect(await retry.json()).toEqual(receipt);
});

test("manual map selection survives denied GPS and isolates OSM traffic", async ({
  page,
  request,
  localOsmTraffic,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.context().clearPermissions();

  await page.goto("/");
  await expect(page.getByText("La ubicación del navegador no está disponible.")).toBeVisible();
  await expect(page.getByText("© OpenStreetMap contributors")).toBeVisible();
  await expect.poll(() => localOsmTraffic.interceptedTiles).toBeGreaterThan(0);

  const candidateMarker = page.getByRole("img", { name: "Map marker" });
  await expect(candidateMarker).not.toBeVisible();
  await page.locator(".maplibregl-canvas").click({ position: { x: 180, y: 120 } });
  await expect(candidateMarker).toBeVisible();
  expect(pageErrors).toEqual([]);
  await expect(page.getByText("Punto candidato seleccionado.", { exact: true })).toBeVisible();

  const initialMarkerBox = await candidateMarker.boundingBox();
  if (!initialMarkerBox) throw new Error("The selected marker has no bounding box");
  await page.locator(".maplibregl-canvas").click({ position: { x: 80, y: 120 } });
  await expect
    .poll(async () => (await candidateMarker.boundingBox())?.x)
    .not.toBe(initialMarkerBox.x);

  const tileResponse = await page.goto(`https://${osmTileHost}/0/0/0.png`);
  if (!tileResponse) throw new Error("The local tile fixture did not produce a response");
  expect(tileResponse.status()).toBe(200);
  expect(await tileResponse.body()).toEqual(localOsmTile);

  for (const host of [
    "openstreetmap.org",
    "www.openstreetmap.org",
    "openstreetmap.org.",
    "www.openstreetmap.org.",
  ]) {
    expect(isOpenStreetMapHost(host), `${host} must be denied before continuation`).toBe(true);
  }
  expect(isOpenStreetMapHost("local-e2e.test")).toBe(false);

  for (const url of [
    "https://openstreetmap.org/",
    "https://www.openstreetmap.org/",
    "https://openstreetmap.org./",
    "https://www.openstreetmap.org./",
  ]) {
    await expect(page.goto(url)).rejects.toThrow(/net::ERR_FAILED/);
    await expect(getFromLocalHarness(request, url)).rejects.toThrow(
      "OSM URL is forbidden in the local E2E API harness",
    );
    await expect(postToLocalHarness(request, url)).rejects.toThrow(
      "OSM URL is forbidden in the local E2E API harness",
    );
  }

  expect(localOsmTraffic.deniedRequests.map((url) => new URL(url).hostname)).toEqual([
    "openstreetmap.org",
    "www.openstreetmap.org",
    "openstreetmap.org.",
    "www.openstreetmap.org.",
  ]);
});

test("anonymous complaint intake counts code points and preserves frozen retry identity", async ({
  page,
}) => {
  await page.context().clearPermissions();
  await page.goto("/");

  await expect(
    page.getByText(
      "Esta versión es solo para uso local y sintético. No es un canal oficial municipal.",
    ),
  ).toBeVisible();

  const map = page.getByRole("region", { name: "Seleccioná el punto del reclamo" });
  await map.click({ position: { x: 230, y: 160 } });
  const confirmPoint = page.getByRole("button", { name: "Confirmar punto" });
  await expect(confirmPoint).toBeEnabled();
  await confirmPoint.click();
  await expect(page.getByText("Punto confirmado para el reclamo.")).toBeVisible();

  await map.click({ position: { x: 250, y: 160 } });
  await expect(page.getByText("Punto confirmado para el reclamo.")).not.toBeVisible();
  await map.click({ position: { x: 230, y: 160 } });
  await confirmPoint.click();

  const photoBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const description = page.getByLabel("Descripción");
  const supplementaryCharacter = "😀";
  await page.getByLabel("Foto").setInputFiles({
    name: "synthetic.jpg",
    mimeType: "image/jpeg",
    buffer: photoBytes,
  });
  await description.fill(supplementaryCharacter.repeat(501));
  await expect(description).toHaveValue(supplementaryCharacter.repeat(501));
  await expect(page.getByText("501/500 caracteres.")).toBeVisible();

  const submit = page.getByRole("button", { name: /Enviar reclamo|Enviando reclamo/ });
  await submit.click();
  await expect(page.getByRole("alert")).toContainText(
    "La descripción no puede superar los 500 caracteres.",
  );

  const acceptedDescription = supplementaryCharacter.repeat(500);
  await description.fill(acceptedDescription);
  await expect(description).toHaveValue(acceptedDescription);
  await expect(page.getByText("500/500 caracteres.")).toBeVisible();
  const whatsapp = "+54 9 2932 555555";
  await page.getByLabel("WhatsApp (opcional)").fill(`  ${whatsapp}  `);

  let releaseRetryableFailure: () => void = () => undefined;
  const retryableFailure = new Promise<void>((resolve) => {
    releaseRetryableFailure = resolve;
  });
  const requests: MultipartSubmission[] = [];
  let firstReceipt: unknown;
  let completeThirdRequest: () => void = () => undefined;
  const thirdRequestCompleted = new Promise<void>((resolve) => {
    completeThirdRequest = resolve;
  });
  await page.route("**/api/complaints", async (route) => {
    requests.push(multipartSubmission(route.request()));
    if (requests.length === 1) {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      firstReceipt = await response.json();
      await retryableFailure;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "intake_unavailable", message: "The submission is invalid." },
        }),
      });
      return;
    }
    if (requests.length === 2) {
      await route.fulfill({ response: await route.fetch() });
      return;
    }
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.fulfill({ response });
    completeThirdRequest();
  });

  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(confirmPoint).toBeDisabled();
  await expect(page.getByLabel("Foto")).toBeDisabled();
  await expect(description).toBeDisabled();
  await expect(page.getByLabel("WhatsApp (opcional)")).toBeDisabled();
  await expect(page.locator(".intake-form__mutable")).toHaveAttribute("inert", "");
  await expect(map).toHaveCSS("pointer-events", "none");

  await description.evaluate((element) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(element, "drifted description");
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const mapBox = await map.boundingBox();
  if (!mapBox) throw new Error("The complaint map has no bounding box");
  await page.mouse.click(mapBox.x + 40, mapBox.y + 40);
  await page.locator("form").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect.poll(() => requests.length).toBe(1);

  releaseRetryableFailure();
  await expect(page.getByRole("alert")).toContainText("Podés reintentar sin perder los datos.");
  await page.getByRole("button", { name: "Reintentar envío" }).click();
  const receipt = page.getByRole("status");
  await expect(receipt).toContainText("Pending");
  await expect(receipt).toContainText("No implica revisión, publicación ni envío al municipio.");
  expect(firstReceipt).toEqual({ complaintId: expect.any(String), status: "Pending" });
  await expect(receipt).toContainText((firstReceipt as { complaintId: string }).complaintId);

  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).toEqual({
    fields: {
      idempotencyKey: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      latitude: expect.any(String),
      locationConfirmed: "true",
      longitude: expect.any(String),
      description: acceptedDescription,
      whatsapp,
    },
    filename: "synthetic.jpg",
    photo: photoBytes,
  });
  expect(await page.getByText(whatsapp).count()).toBe(0);
  await expect(description).toHaveValue("");
  await expect(page.getByLabel("WhatsApp (opcional)")).toHaveValue("");

  await map.click({ position: { x: 230, y: 160 } });
  await confirmPoint.click();
  await page.getByLabel("Foto").setInputFiles({
    name: "synthetic.jpg",
    mimeType: "image/jpeg",
    buffer: photoBytes,
  });
  await submit.click();
  await thirdRequestCompleted;
  expect(requests).toHaveLength(3);
  expect(requests[2].fields.idempotencyKey).not.toBe(requests[0].fields.idempotencyKey);
});

test("unknown API paths never become SPA HTML, including navigations", async ({
  request,
  page,
}) => {
  for (const path of ["/api", "/api/missing", "/api/health/"]) {
    const api = await getFromLocalHarness(request, path);
    expect(api.status()).toBe(404);
    expect(api.headers()["content-type"]).toContain("application/json");
    expect(await api.json()).toEqual({ error: "Not found" });
    const navigation = await page.goto(path);
    expect(navigation?.status()).toBe(404);
    expect(navigation?.headers()["content-type"]).toContain("application/json");
    expect(await navigation?.json()).toEqual({ error: "Not found" });
  }
});
