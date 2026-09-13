import { coversRosales } from "./territory";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FIELDS = new Set([
  "idempotencyKey",
  "longitude",
  "latitude",
  "locationConfirmed",
  "photo",
  "description",
  "whatsapp",
]);

type D1 = {
  prepare(query: string): {
    bind(...values: unknown[]): { run(): Promise<unknown>; first<T>(): Promise<T | null> };
  };
};
export type ComplaintIntakeEnv = {
  DB: D1;
  PRIVATE_IMAGES: {
    put(
      key: string,
      bytes: ArrayBuffer,
      options?: { httpMetadata?: { contentType: string }; customMetadata?: Record<string, string> },
    ): Promise<unknown>;
  };
};

export type PendingComplaint = {
  id: string;
  idempotencyKey: string;
  requestFingerprint: string;
  status: "Pending";
  durabilityState: "staged" | "complete";
  longitude: number;
  latitude: number;
  description?: string;
  whatsapp?: string;
  photoKey: string;
  photoFormat: string;
  photoSize: number;
  createdAt: string;
  completedAt?: string;
};

export interface PendingIntakeStore {
  reserve(proposed: PendingComplaint): Promise<PendingComplaint>;
  complete(complaintId: string, completedAt: string, requestFingerprint?: string): Promise<void>;
}

export interface PrivateOriginalStore {
  put(key: string, bytes: ArrayBuffer, contentType?: string): Promise<void>;
}

type CoordinatorInput = Omit<
  PendingComplaint,
  "id" | "status" | "durabilityState" | "photoKey" | "photoSize" | "createdAt" | "completedAt"
> & { photoBytes: ArrayBuffer };
type CoordinatorDependencies = {
  pendingStore: PendingIntakeStore;
  privateOriginalStore: PrivateOriginalStore;
  now: () => string;
  createId: () => string;
};
type Receipt = { complaintId: string; status: "Pending" };
export type CoordinatorOutcome =
  | { kind: "accepted"; receipt: Receipt; replayed: boolean }
  | { kind: "conflict" }
  | { kind: "unavailable" };

export async function coordinateComplaintIntake(
  input: CoordinatorInput,
  dependencies: CoordinatorDependencies,
): Promise<CoordinatorOutcome> {
  const proposed: PendingComplaint = {
    id: dependencies.createId(),
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
    status: "Pending",
    durabilityState: "staged",
    longitude: input.longitude,
    latitude: input.latitude,
    description: input.description,
    whatsapp: input.whatsapp,
    photoKey: "",
    photoFormat: input.photoFormat,
    photoSize: input.photoBytes.byteLength,
    createdAt: dependencies.now(),
  };
  proposed.photoKey = `pending-originals/v1/${proposed.id}`;
  let complaint: PendingComplaint;
  try {
    complaint = await dependencies.pendingStore.reserve(proposed);
  } catch {
    return { kind: "unavailable" };
  }
  if (complaint.requestFingerprint !== input.requestFingerprint) return { kind: "conflict" };
  const receipt = { complaintId: complaint.id, status: "Pending" } as const;
  if (complaint.durabilityState === "complete")
    return { kind: "accepted", receipt, replayed: true };
  try {
    await dependencies.privateOriginalStore.put(
      complaint.photoKey,
      input.photoBytes,
      complaint.photoFormat,
    );
    await dependencies.pendingStore.complete(
      complaint.id,
      dependencies.now(),
      input.requestFingerprint,
    );
  } catch {
    return { kind: "unavailable" };
  }
  return { kind: "accepted", receipt, replayed: false };
}

type IntakeErrorCode =
  | "invalid_submission"
  | "outside_territory"
  | "photo_too_large"
  | "unsupported_photo";
class IntakeError extends Error {
  constructor(
    readonly status: number,
    readonly code: IntakeErrorCode,
  ) {
    super(code);
  }
}

function error(
  status: number,
  code: IntakeErrorCode | "idempotency_conflict" | "intake_unavailable",
) {
  return Response.json({ error: { code, message: "The submission is invalid." } }, { status });
}
function invalid(): never {
  throw new IntakeError(400, "invalid_submission");
}
function singleton(values: Map<string, FormDataEntryValue[]>, name: string, optional = false) {
  const entries = values.get(name) ?? [];
  if ((optional && entries.length === 0) || entries.length === 1) return entries[0];
  return invalid();
}
function decimal(value: FormDataEntryValue | undefined, min: number, max: number) {
  if (typeof value !== "string" || !/^-?(?:\d+|\d*\.\d+)$/.test(value)) invalid();
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max) invalid();
  return result;
}
function optionalText(value: FormDataEntryValue | undefined) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") invalid();
  return value.trim() || undefined;
}
function isoBmffBrands(bytes: Uint8Array): string[] | undefined {
  if (bytes.byteLength < 16 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp")
    return undefined;
  const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (boxSize < 16 || boxSize > bytes.byteLength || (boxSize - 16) % 4 !== 0) return undefined;

  const brands = [String.fromCharCode(...bytes.slice(8, 12))];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4)
    brands.push(String.fromCharCode(...bytes.slice(offset, offset + 4)));
  return brands;
}
function imageFormat(bytes: Uint8Array): string | undefined {
  const starts = (...header: number[]) => header.every((byte, index) => bytes[index] === byte);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  const brands = isoBmffBrands(bytes);
  if (!brands) return undefined;
  if (brands.some((brand) => ["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand)))
    return "image/heic";
  return brands.some((brand) => ["mif1", "msf1"].includes(brand)) ? "image/heif" : undefined;
}
async function fingerprint(values: readonly (string | Uint8Array)[]) {
  const encoder = new TextEncoder();
  const parts = values.map((value) => (typeof value === "string" ? encoder.encode(value) : value));
  const total = parts.reduce((size, value) => size + 4 + value.byteLength, 0);
  const input = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    new DataView(input.buffer).setUint32(offset, part.byteLength);
    offset += 4;
    input.set(part, offset);
    offset += part.byteLength;
  }
  const hash = await crypto.subtle.digest("SHA-256", input);
  return `v1:${[...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function d1Store(env: ComplaintIntakeEnv): PendingIntakeStore {
  return {
    async reserve(complaint) {
      await env.DB.prepare(
        "INSERT INTO pending_complaints (id, idempotency_key, request_fingerprint, status, durability_state, longitude, latitude, description, whatsapp, photo_key, photo_format, photo_size, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL) ON CONFLICT(idempotency_key) DO NOTHING",
      )
        .bind(
          complaint.id,
          complaint.idempotencyKey,
          complaint.requestFingerprint,
          complaint.status,
          complaint.durabilityState,
          complaint.longitude,
          complaint.latitude,
          complaint.description ?? null,
          complaint.whatsapp ?? null,
          complaint.photoKey,
          complaint.photoFormat,
          complaint.photoSize,
          complaint.createdAt,
        )
        .run();
      const row = await env.DB.prepare("SELECT * FROM pending_complaints WHERE idempotency_key = ?")
        .bind(complaint.idempotencyKey)
        .first<Record<string, unknown>>();
      if (!row) throw new Error("missing reservation");
      return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
          value ?? undefined,
        ]),
      ) as PendingComplaint;
    },
    async complete(id, completedAt, requestFingerprint) {
      await env.DB.prepare(
        "UPDATE pending_complaints SET durability_state = 'complete', completed_at = ? WHERE id = ? AND request_fingerprint = ? AND durability_state = 'staged'",
      )
        .bind(completedAt, id, requestFingerprint)
        .run();
    },
  };
}

export async function handleComplaintIntake(
  request: Request,
  env: ComplaintIntakeEnv,
): Promise<Response> {
  if (request.method !== "POST")
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } },
    );
  if (!/^multipart\/form-data(?:\s*;|$)/i.test(request.headers.get("Content-Type") ?? ""))
    return error(400, "invalid_submission");
  try {
    let entries: [string, FormDataEntryValue][];
    try {
      entries = [...(await request.formData()).entries()];
    } catch {
      invalid();
    }
    if (entries.some(([name]) => !FIELDS.has(name))) invalid();
    const values = new Map<string, FormDataEntryValue[]>();
    for (const [name, value] of entries) values.set(name, [...(values.get(name) ?? []), value]);
    const idempotencyKey = singleton(values, "idempotencyKey");
    if (typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey)) invalid();
    const longitude = decimal(singleton(values, "longitude"), -180, 180);
    const latitude = decimal(singleton(values, "latitude"), -90, 90);
    if (
      singleton(values, "locationConfirmed") !== "true" ||
      !coversRosales([longitude, latitude])
    ) {
      if (!coversRosales([longitude, latitude])) throw new IntakeError(400, "outside_territory");
      invalid();
    }
    const description = optionalText(singleton(values, "description", true));
    const whatsapp = optionalText(singleton(values, "whatsapp", true));
    if (description && [...description].length > 500) invalid();
    const photo = singleton(values, "photo");
    if (typeof photo === "string" || photo.size === 0) invalid();
    if (photo.size > MAX_PHOTO_BYTES) throw new IntakeError(413, "photo_too_large");
    const photoBytes = new Uint8Array(await photo.arrayBuffer());
    const photoFormat = imageFormat(photoBytes);
    if (!photoFormat) throw new IntakeError(415, "unsupported_photo");
    const requestFingerprint = await fingerprint([
      String(longitude),
      String(latitude),
      "true",
      description ?? "",
      whatsapp ?? "",
      photoFormat,
      String(photoBytes.byteLength),
      photoBytes,
    ]);
    const outcome = await coordinateComplaintIntake(
      {
        idempotencyKey,
        requestFingerprint,
        longitude,
        latitude,
        description,
        whatsapp,
        photoFormat,
        photoBytes: photoBytes.buffer,
      },
      {
        pendingStore: d1Store(env),
        privateOriginalStore: {
          async put(key, bytes, contentType) {
            await env.PRIVATE_IMAGES.put(key, bytes, {
              httpMetadata: { contentType: contentType ?? "application/octet-stream" },
              customMetadata: { flow: "pending-intake-v1" },
            });
          },
        },
        now: () => new Date().toISOString(),
        createId: () => crypto.randomUUID(),
      },
    );
    if (outcome.kind === "conflict") return error(409, "idempotency_conflict");
    if (outcome.kind === "unavailable") return error(503, "intake_unavailable");
    return Response.json(outcome.receipt, { status: outcome.replayed ? 200 : 201 });
  } catch (caught) {
    if (caught instanceof IntakeError) return error(caught.status, caught.code);
    return error(503, "intake_unavailable");
  }
}
