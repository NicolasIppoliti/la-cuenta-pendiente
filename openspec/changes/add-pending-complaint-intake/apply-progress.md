# Apply Progress: Add Pending Complaint Intake

## Status

**Tasks 1–2 complete** in the first `stacked-to-main` slice (`territory/data`). The explicitly authorized `territory-boundary-correction` corrected Task 1's boundary predicate and added independent exterior regressions. Tasks 3–8 remain intentionally untouched; parent-owned lifecycle actions remain deferred.

### Structured status consumed

- `changeName`: `add-pending-complaint-intake`
- `artifactStore`: `openspec`; native `applyState`: `ready`
- `actionContext`: `repo-local`; allowed edit root: `/Users/nicolasmateoippoliti/dev/la-cuenta-pendiente`
- Delivery: `ask-on-risk` resolved as `chained` / `stacked-to-main`; current slice Tasks 1–2; 400 authored-line budget; no `size:exception`.
- Strict TDD: active; runner `pnpm test`.
- Action-context warning: CodeGraph initialization was attempted after root resolution but the `codegraph` executable is unavailable on `PATH`; direct, scoped file inspection was used as the documented fallback.

## Completed work

- [x] Implement and verify the pinned Rosales territory seam. <!-- sdd-owner: implementation -->
  - Added the versioned IGN Feature 352 / CODINDEC `06182` EPSG:4326 fixture with source, publisher, feature identity, source name, and retrieval metadata.
  - Added `coversRosales()` with finite/range checks, boundary inclusion, polygon interior logic, and generic hole exclusion.
  - The authorized correction replaced the absolute-coordinate-scale-squared cross/dot allowance with separate local cross and dot roundoff bounds. They scale only with `Number.EPSILON`, coordinate rounding scale, and the relevant local deltas; no geographic buffer was added.
  - The fixed independently verified exterior literal and one exterior endpoint-extension literal are rejected; the exact fixture-vertex boundary literal remains accepted.
- [x] Implement and verify the local Pending schema without touching remote resources. <!-- sdd-owner: implementation -->
  - Added forward and local-only reversal SQL for `pending_complaints`, with the required unique idempotency key, Pending-only status, staged/complete state, and completion consistency constraint.
  - Added the verified Wrangler `d1 migrations apply DB --local` invocation before the existing E2E workerd startup. Wrangler `4.131.1` help confirmed this command and its `--local` option.
  - Added a focused schema expectation.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1. Pin territory | `tests/complaint-intake.test.ts` | Unit | N/A (new files) | `coversRosales` import failed because the module did not exist | 3/3 territory literals passed | Interior, exact boundary, and exterior literal cases passed | Formatter/type correction; 3/3 passed again |
| 1. Territory boundary correction | `tests/complaint-intake.test.ts` | Unit | Exact fixture-vertex boundary literal retained | Fixed exterior literal failed (`true` received, `false` expected) | Local cross/dot roundoff bounds made the regression pass | Added one independent exterior endpoint-extension literal to prevent cross/dot scale coupling; 17 focused tests passed | Biome formatted only the two changed files; focused suite and Biome check passed again |
| 2. Local D1 schema | `tests/worker.test.ts` / `scripts/e2e.mjs` | Unit + local D1/workerd | `tests/worker.test.ts`: 11/11 before edit; E2E pre-edit safety run was missed, but post-change local harness passed 4/4 | Focused test failed because `migrations/0001_pending_complaints.sql` did not exist | Focused schema test passed | A fresh local E2E run applied migration `0001_pending_complaints.sql`; subsequent local run reported no pending migrations, both with 4/4 Playwright tests passing | Formatter run; focused/full worker tests and local E2E passed afterward |

## Verification evidence

- Independent verifier's fixed exterior point `[-61.72631453499998, -38.68756866499996]`, approximately `9.89576730506735e-9` degrees from the nearest boundary, was first proven RED: `coversRosales()` returned `true` where `false` was expected.
- `pnpm test -- tests/complaint-intake.test.ts -t territory` — RED failed exactly at the fixed exterior literal; GREEN passed 16 tests; TRIANGULATE/REFACTOR passed 17 tests after one additional exterior endpoint-extension literal.
- `pnpm exec biome check worker/territory.ts tests/complaint-intake.test.ts` — passed after formatting.
- `pnpm exec vitest run tests/worker.test.ts -t "pending_complaints migration"` — passed.
- `pnpm exec vitest run tests/worker.test.ts` — passed (12 tests).
- `pnpm exec wrangler --version` — `4.131.1`.
- `pnpm exec wrangler d1 migrations apply --help` — verified `d1 migrations apply <database> --local`.
- `pnpm test:e2e` — passed twice (4 Playwright tests each); first run applied the local migration in `.wrangler/state/v3/d1`, the later run found none pending.
- `pnpm typecheck` — passed.
- `pnpm exec biome check scripts/e2e.mjs tests/worker.test.ts tests/complaint-intake.test.ts worker/territory.ts migrations/0001_pending_complaints.sql rollback/0001_pending_complaints.sql` — passed after formatting.

Runtime boundary: D1 evidence is local-only via Wrangler/workerd. Remote D1, provisioning, deployment, and production operations are **N/A** and were not attempted.

## Files changed

- `worker/data/ign-06182.json`
- `worker/territory.ts`
- `tests/complaint-intake.test.ts`
- `migrations/0001_pending_complaints.sql`
- `rollback/0001_pending_complaints.sql`
- `scripts/e2e.mjs`
- `tests/worker.test.ts`
- `openspec/changes/add-pending-complaint-intake/tasks.md`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

## Remaining tasks

- [ ] Implement and verify reservation, deterministic private-object recovery, and idempotent completion. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the write-only `POST /api/complaints` contract. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the real local storage boundary for one synthetic intake. <!-- sdd-owner: implementation -->
- [ ] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

## Deferred lifecycle actions

- [x] Before apply, stop and obtain an explicit user-owned delivery decision for the High review-budget forecast; user selected chained delivery with `stacked-to-main`. No `size:exception` was granted. <!-- sdd-owner: parent -->
- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

## Workload / PR boundary

This is the first review slice only: Tasks 1–2 (`territory/data`) of the selected `stacked-to-main` chain. The corrective work unit is within its explicit 40-line source/test budget and completes Task 1 before Tasks 3–4. The implementation source/test/migration changes are within the 400 authored-line budget when the pinned GeoJSON is treated as its single versioned data document; its 725,418-byte geometry remains a review consideration. No `size:exception`, dependency, commit, branch, push, PR, remote migration, provisioning, deployment, or production operation occurred.

## Deviations and prior progress

- The prior progress record's blocker came from automatic retries that stalled or lost the delivery decision. This continuation received the resolved delivery path, acquired the active attempt, and completed the assigned slice.
- The Task 2 E2E safety-net baseline was inadvertently not run before editing `scripts/e2e.mjs`; the existing Worker safety net was 11/11, and the post-change local E2E harness passed 4/4 twice. No pre-existing failure was observed.
- Independent verification found a territory-acceptance defect after the native attempt had already settled `passed`. The user explicitly authorized `territory-boundary-correction`; attempt ordinal 5 was acquired and used for this bounded correction.

## Accounting-reset revalidation

After the user-authorized correction-accounting reset from 40 to 400 changed lines, the existing `territory-boundary-correction` was revalidated without a source or test edit.

- `pnpm test -- tests/complaint-intake.test.ts -t territory` passed: 2 files and 17 tests.
- `pnpm exec biome check worker/territory.ts tests/complaint-intake.test.ts` passed with no fixes.
- The exact pinned-fixture boundary literal `[-61.72631454499998, -38.68756866499996]` remains accepted.
- Both independent exterior regressions remain rejected, including `[-61.72631453499998, -38.68756866499996]` and the endpoint-extension literal `[-61.72535704796371, -38.68594741204858]`.
- Inspection confirms `onSegment()` uses separate cross and dot tolerances derived from `Number.EPSILON`, local coordinate rounding scale, and local segment/point deltas. It defines no fixed geographic distance or acceptance buffer.
- Task 1 remains visibly checked in `tasks.md`; Tasks 3–8 and all parent-owned lifecycle work remain untouched.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1. Territory boundary correction revalidation | `tests/complaint-intake.test.ts` | Unit | Existing correction suite passed: 17 tests | N/A — revalidation only; no code/test edit | Existing correction remains green | Both independent exterior regressions plus exact boundary passed | No refactor or source edit |
