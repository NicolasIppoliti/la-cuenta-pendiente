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
  complete(complaintId: string, completedAt: string): Promise<void>;
}

export interface PrivateOriginalStore {
  put(key: string, bytes: ArrayBuffer): Promise<void>;
}

type CoordinatorInput = {
  idempotencyKey: string;
  requestFingerprint: string;
  longitude: number;
  latitude: number;
  description?: string;
  whatsapp?: string;
  photoFormat: string;
  photoBytes: ArrayBuffer;
};

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
  const createdAt = dependencies.now();
  const complaintId = dependencies.createId();
  const proposed: PendingComplaint = {
    id: complaintId,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
    status: "Pending",
    durabilityState: "staged",
    longitude: input.longitude,
    latitude: input.latitude,
    description: input.description,
    whatsapp: input.whatsapp,
    photoKey: `pending-originals/v1/${complaintId}`,
    photoFormat: input.photoFormat,
    photoSize: input.photoBytes.byteLength,
    createdAt,
  };

  let complaint: PendingComplaint;
  try {
    complaint = await dependencies.pendingStore.reserve(proposed);
  } catch {
    return { kind: "unavailable" };
  }

  if (complaint.requestFingerprint !== input.requestFingerprint) {
    return { kind: "conflict" };
  }

  const receipt: Receipt = { complaintId: complaint.id, status: "Pending" };
  if (complaint.durabilityState === "complete") {
    return { kind: "accepted", receipt, replayed: true };
  }

  try {
    await dependencies.privateOriginalStore.put(complaint.photoKey, input.photoBytes);
    await dependencies.pendingStore.complete(complaint.id, dependencies.now());
  } catch {
    return { kind: "unavailable" };
  }

  return { kind: "accepted", receipt, replayed: false };
}
