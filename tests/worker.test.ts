import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import worker from "../worker/index";

test("GET health reports process liveness", async () => {
  const response = await worker.fetch(new Request("http://localhost/api/health"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test.each(["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])(
  "%s health rejects unsupported methods",
  async (method) => {
    const response = await worker.fetch(new Request("http://localhost/api/health", { method }));
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  },
);

test.each(["/api", "/api/missing", "/api/health/", "/api/health/nested"])(
  "%s returns JSON not found",
  async (path) => {
    const response = await worker.fetch(new Request(`http://localhost${path}`));
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "Not found" });
  },
);

class TestDatabase {
  rows = new Map<string, Record<string, unknown>>();
  prepare(query: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => {
          if (query.startsWith("INSERT") && !this.rows.has(values[1] as string)) {
            const keys =
              "id,idempotency_key,request_fingerprint,status,durability_state,longitude,latitude,description,whatsapp,photo_key,photo_format,photo_size,created_at".split(
                ",",
              );
            this.rows.set(
              values[1] as string,
              Object.fromEntries(keys.map((key, index) => [key, values[index]])),
            );
          }
          if (query.startsWith("UPDATE"))
            for (const row of this.rows.values())
              if (row.id === values[1])
                Object.assign(row, { durability_state: "complete", completed_at: values[0] });
        },
        first: async <T>() => (this.rows.get(values.at(-1) as string) ?? null) as T | null,
      }),
    };
  }
}

function form(overrides: Record<string, FormDataEntryValue | undefined> = {}) {
  const result = new FormData();
  const values = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    longitude: "-62.078",
    latitude: "-38.875",
    locationConfirmed: "true",
    description: "Synthetic pothole",
    whatsapp: "  +5492215551234  ",
    photo: new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "private.jpg"),
    ...overrides,
  };
  for (const [key, value] of Object.entries(values))
    if (value !== undefined) result.set(key, value);
  return result;
}
function env() {
  return { DB: new TestDatabase(), PRIVATE_IMAGES: { put: async () => undefined } };
}
function request(body: FormData, method = "POST") {
  return new Request("http://localhost/api/complaints", {
    method,
    ...(method === "POST" ? { body } : {}),
  });
}
function nonMultipartRequest(parsedForm: FormData) {
  const result = new Request("http://localhost/api/complaints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  Object.defineProperty(result, "formData", { value: async () => parsedForm });
  return result;
}
function isoBmffFtyp(majorBrand: string, compatibleBrands: readonly string[] = []) {
  const size = 16 + compatibleBrands.length * 4;
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, size);
  bytes.set(new TextEncoder().encode("ftyp"), 4);
  bytes.set(new TextEncoder().encode(majorBrand), 8);
  for (const [index, brand] of compatibleBrands.entries())
    bytes.set(new TextEncoder().encode(brand), 16 + index * 4);
  return bytes;
}

const error = (code: string) => ({ error: { code, message: "The submission is invalid." } });

test("complaint intake accepts one valid private multipart submission", async () => {
  const bindings = env();
  const response = await worker.fetch(request(form()), bindings);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ complaintId: expect.any(String), status: "Pending" });
});

test("complaint intake rejects an HEIC brand outside the declared ftyp box", async () => {
  const bytes = new Uint8Array([...isoBmffFtyp("avif"), ...new TextEncoder().encode("heic")]);
  const response = await worker.fetch(
    request(form({ photo: new File([bytes], "private.avif") })),
    env(),
  );

  expect(response.status).toBe(415);
  expect(await response.json()).toEqual(error("unsupported_photo"));
});

test("complaint intake rejects a declared ftyp box with a dangling compatible-brand byte", async () => {
  const bytes = new Uint8Array(17);
  new DataView(bytes.buffer).setUint32(0, 17);
  bytes.set(new TextEncoder().encode("ftypheic"), 4);
  bytes[16] = 0;
  const response = await worker.fetch(
    request(form({ photo: new File([bytes], "private.heic") })),
    env(),
  );

  expect(response.status).toBe(415);
  expect(await response.json()).toEqual(error("unsupported_photo"));
});

test("complaint intake rejects a non-multipart request before parsed fields are considered", async () => {
  const response = await worker.fetch(nonMultipartRequest(form()), env());

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual(error("invalid_submission"));
});

test.each([
  ["HEIC major brand", isoBmffFtyp("heic")],
  ["HEIF compatible brand", isoBmffFtyp("avif", ["mif1"])],
  ["PNG signature", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ["WebP signature", new TextEncoder().encode("RIFF\0\0\0\0WEBP")],
])("complaint intake accepts a valid %s photo", async (_name, bytes) => {
  const response = await worker.fetch(
    request(form({ photo: new File([bytes], "private.photo") })),
    env(),
  );

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ complaintId: expect.any(String), status: "Pending" });
});

test.each([
  ["missing photo", () => form({ photo: undefined }), 400, "invalid_submission"],
  [
    "multiple photos",
    () => {
      const result = form();
      result.append("photo", new File([new Uint8Array([0xff, 0xd8, 0xff])], "second.jpg"));
      return result;
    },
    400,
    "invalid_submission",
  ],
  [
    "oversized photo",
    () => form({ photo: new File([new Uint8Array(15 * 1024 * 1024 + 1)], "large.jpg") }),
    413,
    "photo_too_large",
  ],
  [
    "disallowed photo",
    () => form({ photo: new File(["not an image"], "private.gif") }),
    415,
    "unsupported_photo",
  ],
  ["overlong description", () => form({ description: "x".repeat(501) }), 400, "invalid_submission"],
  ["unconfirmed location", () => form({ locationConfirmed: "false" }), 400, "invalid_submission"],
  [
    "exterior location",
    () => form({ longitude: "-62.3", latitude: "-39.1" }),
    400,
    "outside_territory",
  ],
])("complaint intake rejects %s with a static private error", async (_name, body, status, code) => {
  const response = await worker.fetch(request(body()), env());
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(error(code));
});

test("complaint intake rejects changed key reuse and non-POST methods", async () => {
  const bindings = env();
  const first = await worker.fetch(request(form()), bindings);
  const changed = await worker.fetch(request(form({ description: "Changed" })), bindings);
  const wrongMethod = await worker.fetch(request(form(), "GET"), env());
  expect(first.status).toBe(201);
  expect(changed.status).toBe(409);
  expect(await changed.json()).toEqual(error("idempotency_conflict"));
  expect(wrongMethod.status).toBe(405);
  expect(wrongMethod.headers.get("Allow")).toBe("POST");
});

test("pending_complaints migration defines the private Pending schema", async () => {
  const migration = await readFile(
    new URL("../migrations/0001_pending_complaints.sql", import.meta.url),
    "utf8",
  );
  expect(migration).toMatch(/CREATE TABLE pending_complaints/);
  expect(migration).toMatch(/idempotency_key TEXT NOT NULL UNIQUE/);
  expect(migration).toMatch(/status TEXT NOT NULL CHECK \(status = 'Pending'\)/);
  expect(migration).toMatch(
    /durability_state TEXT NOT NULL CHECK \(durability_state IN \('staged', 'complete'\)\)/,
  );
  expect(migration).toMatch(
    /CHECK \(\(durability_state = 'complete' AND completed_at IS NOT NULL\) OR \(durability_state = 'staged' AND completed_at IS NULL\)\)/,
  );
});
