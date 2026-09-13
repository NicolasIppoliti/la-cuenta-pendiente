import { expect, test } from "vitest";
import {
  coordinateComplaintIntake,
  type PendingComplaint,
  type PendingIntakeStore,
  type PrivateOriginalStore,
} from "../worker/complaint-intake";
import { coversRosales } from "../worker/territory";

class MemoryPendingStore implements PendingIntakeStore {
  readonly complaints = new Map<string, PendingComplaint>();

  async reserve(proposed: PendingComplaint): Promise<PendingComplaint> {
    const existing = this.complaints.get(proposed.idempotencyKey);
    if (existing) return existing;

    this.complaints.set(proposed.idempotencyKey, proposed);
    return proposed;
  }

  async complete(complaintId: string, completedAt: string): Promise<void> {
    for (const [key, complaint] of this.complaints) {
      if (complaint.id === complaintId) {
        this.complaints.set(key, {
          ...complaint,
          durabilityState: "complete",
          completedAt,
        });
        return;
      }
    }
    throw new Error("missing complaint");
  }
}

class MemoryPrivateOriginalStore implements PrivateOriginalStore {
  readonly originals = new Map<string, Uint8Array>();
  failNextPut = false;

  async put(key: string, bytes: ArrayBuffer): Promise<void> {
    if (this.failNextPut) {
      this.failNextPut = false;
      throw new Error("R2 unavailable");
    }
    this.originals.set(key, new Uint8Array(bytes));
  }
}

const intake = {
  idempotencyKey: "submission-1",
  requestFingerprint: "v1:first",
  longitude: -62.078,
  latitude: -38.875,
  description: undefined,
  whatsapp: undefined,
  photoFormat: "image/jpeg",
  photoBytes: new Uint8Array([1, 2, 3]).buffer,
};

function dependencies(store: MemoryPendingStore, originals: MemoryPrivateOriginalStore) {
  return {
    pendingStore: store,
    privateOriginalStore: originals,
    now: () => "2026-02-18T00:00:00.000Z",
    createId: () => "complaint-1",
  };
}

test("territory accepts a known interior point", () => {
  expect(coversRosales([-62.078, -38.875])).toBe(true);
});

test("territory accepts a point on the pinned fixture boundary", () => {
  expect(coversRosales([-61.72631454499998, -38.68756866499996])).toBe(true);
});

test("territory rejects an independently verified near-boundary exterior point", () => {
  expect(coversRosales([-61.72631453499998, -38.68756866499996])).toBe(false);
});

test("territory rejects an exterior point just beyond a segment endpoint", () => {
  expect(coversRosales([-61.72535704796371, -38.68594741204858])).toBe(false);
});

test("territory rejects a known exterior point", () => {
  expect(coversRosales([-62.3, -39.1])).toBe(false);
});

test("a partial private-write failure remains staged and the same retry completes it", async () => {
  const store = new MemoryPendingStore();
  const originals = new MemoryPrivateOriginalStore();
  originals.failNextPut = true;

  await expect(coordinateComplaintIntake(intake, dependencies(store, originals))).resolves.toEqual({
    kind: "unavailable",
  });
  expect([...store.complaints.values()]).toMatchObject([
    { id: "complaint-1", durabilityState: "staged", photoKey: "pending-originals/v1/complaint-1" },
  ]);

  await expect(coordinateComplaintIntake(intake, dependencies(store, originals))).resolves.toEqual({
    kind: "accepted",
    receipt: { complaintId: "complaint-1", status: "Pending" },
    replayed: false,
  });
  expect([...store.complaints.values()]).toMatchObject([{ durabilityState: "complete" }]);
  expect([...originals.originals.entries()]).toEqual([
    ["pending-originals/v1/complaint-1", new Uint8Array([1, 2, 3])],
  ]);
});

test("a lost response retry returns the completed receipt without another logical record or original", async () => {
  const store = new MemoryPendingStore();
  const originals = new MemoryPrivateOriginalStore();

  const first = await coordinateComplaintIntake(intake, dependencies(store, originals));
  const retry = await coordinateComplaintIntake(intake, dependencies(store, originals));

  expect(first).toEqual({
    kind: "accepted",
    receipt: { complaintId: "complaint-1", status: "Pending" },
    replayed: false,
  });
  expect(retry).toEqual({
    kind: "accepted",
    receipt: { complaintId: "complaint-1", status: "Pending" },
    replayed: true,
  });
  expect(store.complaints).toHaveLength(1);
  expect(originals.originals).toEqual(
    new Map([["pending-originals/v1/complaint-1", new Uint8Array([1, 2, 3])]]),
  );
});

test("the same idempotency key cannot alias changed private content", async () => {
  const store = new MemoryPendingStore();
  const originals = new MemoryPrivateOriginalStore();

  await coordinateComplaintIntake(intake, dependencies(store, originals));
  const outcome = await coordinateComplaintIntake(
    { ...intake, requestFingerprint: "v1:changed", photoBytes: new Uint8Array([4, 5, 6]).buffer },
    dependencies(store, originals),
  );

  expect(outcome).toEqual({ kind: "conflict" });
  expect(store.complaints).toHaveLength(1);
  expect(originals.originals).toEqual(
    new Map([["pending-originals/v1/complaint-1", new Uint8Array([1, 2, 3])]]),
  );
});
