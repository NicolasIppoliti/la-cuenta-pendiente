# Apply Progress: Add Pending Complaint Intake

## Status

**Tasks 1–3 complete** across the selected `stacked-to-main` chain. The first `territory/data` slice and its explicitly authorized `territory-boundary-correction` are retained. This bounded continuation completed Task 3; Task 4 remains unchecked because completing the full request-contract implementation and its direct-request test matrix would exceed the fixed 400 authored-line budget for this attempt. Tasks 4–8 remain intentionally untouched; parent-owned lifecycle actions remain deferred.

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

## Tasks 3–4 continuation (retry 1)

### Completed work

- [x] Implement and verify reservation, deterministic private-object recovery, and idempotent completion. <!-- sdd-owner: implementation -->
  - Added `coordinateComplaintIntake()` and narrow injected `PendingIntakeStore` / `PrivateOriginalStore` interfaces in `worker/complaint-intake.ts`.
  - The coordinator reserves one staged logical submission, uses `pending-originals/v1/{complaintId}`, reports storage failures as non-success, resumes a staged same-key retry, replays a complete receipt, and rejects a reused key with a changed fingerprint.
  - No R2 compensation/delete path, public read route, route wiring, validation, logging, migration, fixture, dependency, UI, E2E, remote, commit, or deployment change was made.
  - The persisted Task 3 checkbox is checked in `tasks.md`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3. D1/R2 coordinator | `tests/complaint-intake.test.ts` | Unit | 17/17 relevant existing tests passed before modification | Import of the absent `worker/complaint-intake` module failed | Coordinator tests passed after the minimal coordinator was added | Partial R2 failure/retry, lost-response replay, and changed-fingerprint conflict all passed | Biome check passed; no behavior refactor was needed |

### Verification evidence

- `pnpm exec vitest run tests/complaint-intake.test.ts --testNamePattern "retry|partial|idempotency"` — focused coordinator scenarios pass.
- `pnpm test` — passed, 2 files / 20 tests.
- `pnpm typecheck` — passed.
- `pnpm exec biome check worker/complaint-intake.ts tests/complaint-intake.test.ts` — passed.
- Runtime boundary: **N/A for Cloudflare compatibility**. The injected in-memory stores deliberately prove recovery sequencing only; real local D1/R2 is deferred to Task 5.

### Workload / PR boundary

- Delivery remains `chained` / `stacked-to-main`; no `size:exception` was granted or inferred.
- The retry used native attempt authority for `tasks-3-4-api-durability` with a 400 changed-line maximum; opaque authority values are intentionally not persisted.
- Task 3 adds 128 test lines and 98 coordinator lines (226 source/test lines). Native attempt accounting recorded 278 changed lines after the required change-local task/progress artifacts. Completing Task 4's direct-request matrix and route implementation in the remaining 122 lines would exceed the fixed attempt budget, so no Task 4 production or test artifact was retained.

### Remaining tasks

- [ ] Implement and verify the write-only `POST /api/complaints` contract. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the real local storage boundary for one synthetic intake. <!-- sdd-owner: implementation -->
- [ ] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status / action context

- Native status consumed: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, authoritative `applyState=ready`, repository-local root `/Users/nicolasmateoippoliti/dev/la-cuenta-pendiente`.
- `actionContext.allowedEditRoots` permitted every changed path. CodeGraph initialization was attempted after root resolution, but the `codegraph` executable was unavailable on `PATH`; scoped direct inspection was the documented fallback.
- The user resolved the workload gate as `chained` / `stacked-to-main`, current branch `feat/pending-complaint-api-durability`, Task 3–4 slice, maximum 400 authored lines. The safety stop above does not reopen that decision.
- Native settlement recorded the failed bounded attempt at evidence revision `sha256:0493159a9ca2b4acaa096dd666f066a664492b22040598a3032d33082f76e2a5`; native runtime status is `decision_required=true`, `next_action=reset`, and `complete=false`. A maintainer-owned reset is required before another acquisition.

## Task 4 continuation (HTTP intake)

- [ ] The write-only `POST /api/complaints` implementation is present but not accepted. Independent verification found malformed ISO-BMFF brand scanning that can misclassify an `avif` box followed by out-of-box `heic`, missing explicit multipart `Content-Type` enforcement, and a failing Biome check in `tests/worker.test.ts`.
- Health and JSON 404 behavior remain unchanged. Task 4 must remain unchecked until those blockers are corrected and independently reverified.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4. HTTP intake | `tests/worker.test.ts` | Direct Worker request | 20/20 | New route assertions returned 404 | 29/29 passed | multipart validation matrix + key conflict | Biome format; 29/29 passed |

**Verification:** `pnpm test -- tests/worker.test.ts`, `pnpm test` (29 passing), `pnpm typecheck`, and scoped Biome check passed. Deterministic direct bindings prove only the HTTP contract; real workerd/D1/R2/browser durability remains **N/A** for Tasks 5/7.

**Files:** `worker/complaint-intake.ts`, `worker/index.ts`, `tests/worker.test.ts`, task/progress artifacts. **Deviation:** CodeGraph executable unavailable; scoped fallback used. **Boundary:** Task 4 only; selected `chained` / `stacked-to-main`, 400 lines, no exception/commit/push/PR/dependency/migration/UI/E2E/remote/deploy.

**Remaining:**
- [ ] Implement and verify the real local storage boundary for one synthetic intake. <!-- sdd-owner: implementation -->
- [ ] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

**Status:** Task 4 is **blocked**. Native accounting recorded 429 changed lines against 400 and requires a maintainer-owned reset. Independent verification additionally rejected the current format parser, multipart enforcement, and formatting state. No review or delivery may proceed until a user-owned split/exception decision, correction, and fresh verification.

## Task 4 correction and revalidation

The user explicitly accepted `size:exception` for this cohesive HTTP intake unit within the selected `chained` / `stacked-to-main` delivery shape. The native changed-line budget is now 500. Task 4 is complete and its implementation-owned checkbox is visibly checked in `tasks.md`; no parent-owned checkbox was modified.

### Correction

- `imageFormat()` now reads the declared 32-bit ISO-BMFF `ftyp` extent only. It considers the major brand at offset 8 and compatible brands only from valid 4-byte slots starting at offset 16; the size/type/minor-version slots and any bytes outside the declared box cannot establish HEIC/HEIF acceptance.
- `handleComplaintIntake()` now rejects every non-`multipart/form-data` `Content-Type` with the static private `400 invalid_submission` response before calling `request.formData()`.
- `tests/worker.test.ts` is formatted. The new direct Worker regressions prove that `avif` with an out-of-box `heic` trailer returns `415 unsupported_photo`, and that an otherwise valid parsed form supplied to a non-multipart request is rejected at the HTTP contract seam.
- Triangulation retains acceptance of HEIC major-brand, HEIF compatible-brand, JPG/JPEG, PNG, and WebP signatures. Existing UUID, location, description, photo, idempotency, health, `405 Allow: POST`, and JSON-404 scenarios remain green.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4. HTTP intake correction | `tests/worker.test.ts` | Direct Worker request | `pnpm test -- tests/worker.test.ts`: 29 passing; targeted Biome initially failed only on the reported line-37 formatting | Added malformed out-of-box `heic` and non-multipart regressions; both failed because each request incorrectly returned `201` | Declared-`ftyp` parsing and pre-`formData()` multipart enforcement made the two regressions pass (31/31) | Added accepted HEIC-major, HEIF-compatible, PNG, and WebP cases while retaining existing JPG/JPEG coverage; 35/35 passed | Formatted Worker test/intake files; focused suite and targeted Biome passed again |

### Fresh verification evidence

- `pnpm test -- tests/worker.test.ts` — passed, 2 files / 35 tests (focused GREEN, TRIANGULATE, and REFACTOR runs).
- `pnpm test` — passed, 2 files / 35 tests.
- `pnpm typecheck` — passed.
- `pnpm exec biome check tests/worker.test.ts worker/complaint-intake.ts worker/index.ts` — passed.
- `git diff --check` — passed.

The direct Worker request seam proves HTTP validation and deterministic test bindings only. Real workerd, local D1/R2 durability, browser behavior, deployment, and production operations remain **N/A** and are deferred to Tasks 5–8.

### Files changed

- `worker/complaint-intake.ts`
- `tests/worker.test.ts`
- `openspec/changes/add-pending-complaint-intake/tasks.md`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

`worker/index.ts` remains within the Task 4 unit from the prior continuation and was not needed for this correction.

### Remaining implementation tasks

- [ ] Implement and verify the real local storage boundary for one synthetic intake. <!-- sdd-owner: implementation -->
- [ ] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status and workload

- Native status consumed: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, authoritative `applyState=ready`; `actionContext=repo-local` and `/Users/nicolasmateoippoliti/dev/la-cuenta-pendiente` was the allowed edit root.
- Delivery path: `ask-on-risk` resolved as `chained` / `stacked-to-main`; user explicitly approved `size:exception` for this Task 4 cohesive HTTP intake unit, with a 500 changed-line native budget. No commit, push, PR, dependency, migration, UI/E2E, remote, provision, deploy, or network action was performed.
- CodeGraph initialization was attempted after project-root resolution, but its executable is unavailable on `PATH`; scoped direct file inspection was used as the documented fallback.

## Task 4 final ISO-BMFF alignment correction

Task 4 remains visibly checked in `tasks.md`. This bounded retry corrected the final independently found malformed-`ftyp` acceptance case; no other implementation or parent-owned task checkbox was modified.

### Correction

- `isoBmffBrands()` now requires the declared compatible-brand region (`boxSize - 16`) to be divisible by four, in addition to the existing minimum 16-byte fields and declared-size-within-available-bytes checks.
- A declared 17-byte `ftyp` box with major brand `heic`, a valid minor version, and one dangling compatible-brand byte is now rejected as `415 unsupported_photo`.
- Major-brand and complete compatible-brand HEIC/HEIF acceptance is unchanged; the minor version is still skipped and declared-out-of-box brands remain inadmissible.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4. ISO-BMFF alignment correction | `tests/worker.test.ts` | Direct Worker request | 35/35 focused tests and targeted Biome passed before the new regression | The exact 17-byte `ftyp` regression returned `201` rather than expected `415` | One compatible-region alignment guard made it pass (36/36) | All prior 35 cases, including explicit multipart rejection, valid major/compatible HEIC/HEIF, JPG/JPEG, PNG, WebP, and out-of-box-brand rejection, remained green | Applied formatter only; focused tests and Biome remained green |

### Fresh verification evidence

- `pnpm test -- tests/worker.test.ts` — passed, 2 files / 36 tests.
- `pnpm test` — passed, 2 files / 36 tests.
- `pnpm typecheck` — passed.
- `pnpm exec biome check tests/worker.test.ts worker/complaint-intake.ts` — passed.
- `git diff --check` — passed.

### Files changed in this retry

- `worker/complaint-intake.ts`
- `tests/worker.test.ts`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining implementation tasks

- [ ] Implement and verify the real local storage boundary for one synthetic intake. <!-- sdd-owner: implementation -->
- [ ] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle action

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status and workload

- Native status was freshly read: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, authoritative `applyState=ready`, `nextRecommended=apply`, 5/10 persisted task rows complete, and no blocked reasons.
- `actionContext=repo-local` permits the repository root; all retry edits are within the user-authorized surfaces.
- Delivery remains `stacked-to-main` with the user's explicit `size:exception` and native 500-line budget. Parent owns runtime settlement and failed-evidence binding; no authority token or attempt record is persisted here.
- Direct Worker tests prove request validation only. Local workerd/D1/R2 durability, browser behavior, deployment, and production operations remain **N/A** and deferred to Tasks 5–8.

## Task 5 local storage E2E

### Completed work

- [x] Implement and verify the real local storage boundary for one synthetic intake. <!-- sdd-owner: implementation -->
  - Added one request-level Playwright scenario using a generated four-byte synthetic JPEG signature (no fixture needed). It posts the same multipart body and idempotency key twice through the existing preview → Portless → workerd path.
  - The first request receives `201` with the private `{ complaintId, status: "Pending" }` receipt; the retry receives `200` and the identical receipt. The scenario has no read/debug endpoint or private-storage inspection.
  - Removed the optional-env fallback that made the actual workerd route answer `404` instead of handing the configured local bindings to the existing intake adapter. Health and unknown API branches are unchanged.
  - The Task 5 checkbox is visibly checked in `tasks.md`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 5. Local D1/R2 retry | `e2e/smoke.spec.ts` | Real local Playwright/workerd | `pnpm test:e2e`: 4/4 existing scenarios passed | New request-level retry scenario received `404` rather than the required first-request `201` | Removing the inappropriate optional-env route guard produced `201` then `200`; 5/5 full E2E passed | The one planned scenario exercises distinct new-intake (`201`) and completed-retry (`200`, same exact receipt) branches with the same opaque multipart image/key | Biome formatted the test and route; final 5/5 E2E remained green |

### Verification evidence

- `pnpm test:e2e` — passed 5/5 Playwright tests after the route fix and again after formatting. The configured E2E runner contains one `e2e/smoke.spec.ts` file, so this was both the relevant file-level run and its complete E2E suite; no out-of-scope runner forwarding change was added solely to pass a grep filter.
- `pnpm test -- tests/worker.test.ts` — passed, 2 files / 36 tests; confirms direct Worker compatibility after the route handoff adjustment.
- `pnpm typecheck` — passed.
- `pnpm exec biome check e2e/smoke.spec.ts worker/index.ts` — passed after formatting.
- `git diff --check` — passed.

Runtime boundary: this is real local Vite preview → Portless → workerd → local D1/private R2 evidence, with the existing `wrangler d1 migrations apply DB --local` step reporting no pending migrations first. It proves local multipart durability/retry behavior only. Remote/deployed D1 or R2, provisioning, deployment, production durability, and production operations are **N/A** and were not attempted.

### Files changed

- `e2e/smoke.spec.ts`
- `worker/index.ts`
- `openspec/changes/add-pending-complaint-intake/tasks.md`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining implementation tasks

- [ ] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle action

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status and workload

- Native status consumed: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, authoritative `applyState=ready`; `actionContext=repo-local` allowed the repository root.
- Delivery is user-resolved as `ask-on-risk` → `chained` → `stacked-to-main`, current branch `feat/pending-complaint-local-storage-e2e`, Task 5 only, 400 changed-line budget, and no exception. This work unit changes 33 source/test lines before its required artifact updates.
- The active native continuation was acquired and settled `passed` for the Task 5 local-storage E2E objective; opaque authority values are intentionally not recorded here. Settlement reported the objective complete.
- CodeGraph initialization was attempted after project-root resolution but the `codegraph` executable is unavailable on `PATH`; scoped direct inspection was used as the documented fallback.
- No fixture, dependency, migration, UI change, read/debug route, remote/network/provision/deploy operation, commit, push, PR, or parent-owned lifecycle action was performed.

## Task 6 manual MapLibre selection

### Completed work

- [x] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->
  - Added the approved `maplibre-gl` dependency and `src/ComplaintMap.tsx`, which owns MapLibre setup and cleanup.
  - Standard OSM raster tiles and visible `© OpenStreetMap contributors` attribution are configured only for `localhost` and `.localhost` hostnames. Other hosts render the map without that source and state that the local basemap is unavailable.
  - Browser geolocation is recenter-only; denial or absence reports a nonblocking hint. A human canvas click places the candidate marker and reports coordinates to the minimal `App` map mount. No confirmation, form, submission, provider fallback, prefetch, offline cache, or public map was added.
  - Added one real Chromium scenario: it denies GPS, intercepts every OSM tile request with a tiny in-test PNG response, verifies visible attribution, and proves that a manual map click creates the visible candidate marker. It makes no external OSM tile request.
  - The persisted Task 6 checkbox is visibly checked in `tasks.md`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 6. MapLibre selection | `e2e/smoke.spec.ts` | Real Chromium / preview / Portless | `pnpm test:e2e`: 5/5 existing scenarios passed | New GPS-denied/manual-click/attribution scenario failed before the map existed | `pnpm build && pnpm test:e2e`: 6/6 passed after adding the local-only MapLibre seam | One scenario covers distinct denied-GPS, intercepted-tile/attribution, and manual-marker paths; no second browser scenario was added because this work unit authorizes one real Chromium scenario | Scoped lifecycle cleanup and formatting; `pnpm test:e2e` remained 6/6 |

### Verification evidence

- `pnpm test:e2e` — safety net passed 5/5; RED failed because the GPS-unavailable UI was absent; final focused/full configured E2E passed 6/6.
- `pnpm typecheck` — passed.
- `pnpm build` — passed. Vite reports the expected MapLibre client chunk-size warning (>500 kB); no speculative code-splitting was added.
- `pnpm exec biome check package.json src/App.tsx src/ComplaintMap.tsx src/styles.css e2e/smoke.spec.ts` — passed.
- `git diff --check` — passed.

Runtime boundary: Chromium exercised the built local preview through Portless with real MapLibre. All `https://tile.openstreetmap.org/**` requests were intercepted and fulfilled locally; production OSM availability/SLA, production tile authorization, deployed resources, and production operations are **N/A** and were not attempted.

### Files changed

- `package.json`
- `pnpm-lock.yaml`
- `src/ComplaintMap.tsx`
- `src/App.tsx`
- `src/styles.css`
- `e2e/smoke.spec.ts`
- `openspec/changes/add-pending-complaint-intake/tasks.md`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining implementation tasks

- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle action

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status, action context, and workload

- Native status consumed: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, authoritative `applyState=ready`; `actionContext=repo-local` allowed the repository root.
- Delivery is user-resolved as `ask-on-risk` → `chained` → `stacked-to-main`, branch `feat/pending-complaint-map-selection`, Task 6 only, 400 changed-line budget, and no exception.
- Native continuation was acquired for this Task 6 objective before every runtime-bearing test/build run; opaque authority values are intentionally not recorded here.
- CodeGraph initialization was attempted after root resolution, but the `codegraph` executable is unavailable on `PATH`; scoped file inspection was the documented fallback.
- No external OSM test traffic, remote resource, paid service, migration, deployment, commit, push, PR, Task 7 form/confirmation/submission, or parent-owned lifecycle action was performed.
- Settlement blocker: the native `sdd-attempt settle` request was rejected as `undeclared_untracked` after the workspace inventory changed from `sha256:6fb4cd582c4337cb4d1461e95eaba6966fefe9ec958dbed13fb08d43f00592c4` to `sha256:8b1bfc80eec07ba78eaaf04ad8645987d34be861240d03ba5be9592676ada0b1`. Per native guard, no retry was attempted; parent must obtain the current untracked ruling before settlement.

## Task 6 map-selection corrective work unit

### Corrected behavior

- Moved OSM interception into an automatic shared Playwright fixture. Every browser test now locally fulfills requests to `tile.openstreetmap.org`; any other `*.openstreetmap.org` request is aborted and recorded, and each test asserts that the unmatched list is empty.
- Fixed manual marker creation: the marker now receives the MapLibre click's `lngLat` before it is added to the map. The regression proves no browser page error, the marker appears, the candidate propagates to `App`, and a second manual click moves the marker.
- Added an `active` guard before every asynchronous geolocation `flyTo()` or React state update, set to false before `map.remove()` during cleanup. Browser-controlled late geolocation callbacks are not deterministically exposable through the existing real MapLibre seam without mocking it, so this guard was verified statically.
- Static non-local-host evidence: `canUseOsmTiles()` permits only `localhost` and `*.localhost`; all non-local hosts receive an empty style source/layer object, so this code path has no OSM tile URL to request. The existing Portless runtime host is intentionally `.localhost`; no external hostname or network request was used.
- Task 6 remains visibly checked in `tasks.md`; the persisted checkbox was re-read after correction. Tasks 7–8 remain unchecked and the parent-owned review action was preserved byte-for-byte.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 6. Map selection correction | `e2e/smoke.spec.ts` | Real Chromium / preview / Portless / MapLibre | Existing E2E suite passed 6/6 before edits | Shared no-escape assertion failed in 3 tests and listed their raw OSM tile URLs; the new App-candidate assertion then exposed the MapLibre marker `lng` page error | Shared local tile fulfillment, map click events, initialized marker coordinates, and guarded geolocation callbacks made the full suite pass 6/6 | A second click proves the visible marker's screen position changes; full suite remained 6/6 | Scoped Biome formatting/import organization only; all checks remained green |

### Fresh verification evidence

- `pnpm build` — passed; regenerated authorized ignored `dist` and `.wrangler/deploy/config.json`. The existing MapLibre chunk-size warning (>500 kB) remains; no code-splitting was added.
- `pnpm test:e2e` — passed 6/6 with all standard OSM tile traffic locally fulfilled and no unmatched external OSM request.
- `pnpm typecheck` — passed.
- `pnpm test` — passed, 2 files / 36 tests.
- `pnpm exec biome check src/ComplaintMap.tsx e2e/smoke.spec.ts` — passed.
- `git diff --check` — passed.

### Files changed

- `src/ComplaintMap.tsx`
- `e2e/smoke.spec.ts`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining implementation tasks

- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle action

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status, action context, and workload

- Consumed authoritative native status: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, `applyState=ready`, repository-local allowed root.
- Delivery remains `stacked-to-main`, Task 6 branch, corrective `map-selection-correction` work unit, 120-line source/test budget, and no `size:exception`.
- The parent acquired and owns settlement of the active corrective objective. No opaque runtime authority value is persisted here.
- CodeGraph initialization was attempted after root resolution; its executable was unavailable on `PATH`, so scoped direct inspection was used.
- No Task 7 form work, Worker/API change, dependency/lock/style change, remote operation, deployment, commit, push, PR, or external OSM network traffic occurred.

## Map-selection correction canonical-400 revalidation

The user-authorized accounting reset is confirmed at the canonical 400-line budget for the existing `map-selection-correction` objective. Revalidation required no source or test edit; Tasks 7–8 remain untouched and no task checkbox changed.

### Inspection confirmation

- The shared automatic Playwright fixture fulfills every request to `tile.openstreetmap.org` with a local PNG; requests to every other `*.openstreetmap.org` host are aborted and recorded, and each test asserts the unmatched list is empty.
- `ComplaintMap` sets its `active` cleanup guard to false before `map.remove()`. Both late geolocation callbacks check that guard before `map.flyTo()` or React's `setGeolocationHint()`.
- The existing Chromium scenario still covers denied GPS, manually propagated candidate state, visible marker creation, and marker movement after a second click.
- `canUseOsmTiles()` remains restricted to `localhost` and `*.localhost`; non-local map styles contain no OSM source or raster layer.

### Strict-TDD revalidation evidence

| Work unit | RED | GREEN / triangulation | Refactor |
|---|---|---|---|
| `map-selection-correction` revalidation | N/A — no source/test behavior changed | Existing candidate, marker, local-tile, and cleanup behavior passed the requested full evidence set | N/A — no source edit |

### Fresh verification evidence

- `pnpm test` — passed, 2 files / 36 tests.
- `pnpm typecheck` — passed.
- `pnpm build` — passed; only the existing MapLibre chunk-size warning was emitted.
- `pnpm test:e2e` — passed, 6/6 through the local preview → Portless → workerd harness. No migrations were pending; the runner cleaned up its owned processes.
- `pnpm exec biome check src/ComplaintMap.tsx e2e/smoke.spec.ts src/App.tsx src/styles.css` — passed.
- `git diff --check` — passed.

The user authorized ignored generated local state and outputs (`.wrangler/deploy/config.json`, `.wrangler/state`, Portless/test results, `dist`, and Vite outputs); no tracked source artifact was changed during this revalidation. Production OSM availability, non-local map runtime, remote resources, deployment, and production operations remain **N/A**.

### Structured status, workload, and lifecycle

- Authoritative status consumed: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, `applyState=ready`, `actionContext=repo-local`, with the repository root as the allowed edit root.
- Native attempt status confirmed the active `map-selection-correction` objective at generation 11 with the explicit 400-line budget. The existing attempt was reacquired only to run bounded evidence; no opaque token is persisted here.
- CodeGraph initialization was attempted after project-root resolution but the executable is unavailable on `PATH`; direct scoped inspection was used.
- Parent owns settlement/closure. No review, receipt, commit, push, PR, network, provisioning, deployment, or Task 7–8 work was started.

## Task 6 OSM test-isolation corrective work unit

### Corrected behavior

- Centralized OpenStreetMap host recognition: both `openstreetmap.org` and every `*.openstreetmap.org` host are now covered.
- The automatic browser route still fulfills `tile.openstreetmap.org` locally before the deny branch; every other recognized OSM host is recorded and aborted, never continued.
- All local `APIRequestContext` GET/POST calls now pass through a minimal URL assertion helper. It rejects bare and subdomain OSM URLs before Playwright can issue an API request; no global monkeypatch or framework wrapper was added.
- The existing Task 6 Chromium scenario now proves local fixture fulfillment, page-route denial for bare and `www` OSM, and API GET/POST rejection for both hosts. Task 6 remains visibly checked; Tasks 7–8 and the parent-owned review row are unchanged.

### TDD Cycle Evidence

| Work unit | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `osm-test-isolation` | `e2e/smoke.spec.ts` | Real Chromium / Playwright API context / preview / Portless | `pnpm test:e2e` passed 6/6 before edit | New bare-host assertion failed: `https://openstreetmap.org/` resolved because the prior predicate matched subdomains only | Central predicate, route denial, and minimal API URL assertions made the suite pass 6/6 | Bare and `www` hosts are each checked through page navigation and API GET/POST; direct local tile fulfillment verifies the tile-first branch | Kept one existing Task 6 scenario (6 total E2E tests) and scoped helpers only; 6/6 remained green |

### Verification evidence

- `pnpm build && pnpm test:e2e` — fresh build passed (existing MapLibre chunk-size warning only); full real local E2E passed 6/6 with local migrations already current.
- `pnpm test` — passed, 2 files / 36 tests.
- `pnpm typecheck` — passed.
- `pnpm exec biome check e2e/smoke.spec.ts` — passed.
- `git diff --check` — passed.

Runtime boundary: Green and final E2E runs use the local preview → Portless → workerd harness. The page route fulfills the configured tile with the in-test PNG and aborts root/subdomain OSM navigation before it can continue. The API URL assertion throws before calling the underlying `APIRequestContext`. Deployment, remote resources, and production OSM availability remain **N/A**.

### Deviation

The RED run intentionally exposed the existing defect: the bare-root navigation resolved before the previous subdomain-only route could stop it, and its `www` subresources were then aborted. This is an external-network escape from the pre-existing guard and conflicts with the requested no-external-network boundary. No Green, triangulation, or final verification run continued an OSM request; all were locally fulfilled or denied.

### Files changed

- `e2e/smoke.spec.ts`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining implementation tasks

- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle action

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status, workload, and lifecycle

- Consumed authoritative native status: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, `applyState=ready`, `actionContext=repo-local`, and the repository root was the allowed edit root.
- Delivery is `stacked-to-main`; this corrective `osm-test-isolation` work unit has the canonical 400-line budget and no `size:exception`.
- CodeGraph initialization was attempted after resolving the project root, but its executable is unavailable on `PATH`; scoped direct inspection was used.
- Parent owns settlement/closure; no authority token is persisted here. No Task 7–8, application, Worker/API, dependency/lock, style, remote, provisioning, deployment, commit, push, PR, or review work was performed.

## Task 6 trailing-dot OSM host normalization

### Corrected behavior

- The shared `isOpenStreetMapHost()` predicate removes DNS trailing dots before exact-root/subdomain matching. It therefore denies `openstreetmap.org.`, `www.openstreetmap.org.`, the ordinary root, and ordinary subdomains without a URL substring check.
- The existing tile-first route still locally fulfills only `tile.openstreetmap.org`; every other normalized OSM host is recorded and aborted before continuation.
- Page navigation and the `APIRequestContext` GET/POST wrappers use that same predicate. The retained local-harness health/unknown-API checks prove a non-OSM relative URL remains allowed.
- Task 6 was already checked and was re-read as visibly complete; Tasks 7–8 remain unchecked. The parent-owned review checkbox was preserved byte-for-byte.

### TDD Cycle Evidence

| Work unit | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `osm-host-normalization` | `e2e/smoke.spec.ts` | Chromium / Playwright API context / local preview | `pnpm test:e2e`: 6/6 | Root and `www` trailing-dot predicate regressions failed: `openstreetmap.org.` returned `false`, proving the prior route/API branch would continue it | Removing trailing DNS dots before root/subdomain matching made the suite pass 6/6 | Ordinary root/subdomain, root/`www` trailing-dot variants through page and API helpers, allowed local host, and local tile fulfillment all pass | Flattened the predicate expression; 6/6 E2E and Biome remained green |

### Fresh verification evidence

- `pnpm build && pnpm test:e2e` — passed; fresh build emitted only the existing MapLibre chunk-size warning and the full local E2E suite passed 6/6.
- `pnpm test` — passed, 2 files / 36 tests.
- `pnpm typecheck` — passed.
- `pnpm exec biome check e2e/smoke.spec.ts` — passed.
- `git diff --check` — passed.

Runtime boundary: Chromium used the local preview → Portless → workerd harness. The tile fixture was fulfilled in-process; root/subdomain OSM page requests were aborted and API calls threw before issuing a request. No external OSM traffic occurred in GREEN, triangulation, refactor, or final verification. Deployed resources, production OSM availability, and production operations remain **N/A**.

### Files changed

- `e2e/smoke.spec.ts`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining implementation tasks

- [ ] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

### Deferred lifecycle action

- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status, workload, and lifecycle

- Consumed authoritative native status: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, `applyState=ready`, `actionContext=repo-local`, with the repository root as the allowed edit root.
- Delivery remains `stacked-to-main`; the parent-authorized `osm-host-normalization` corrective work unit has the canonical 400-line budget. No `size:exception` was used or inferred.
- CodeGraph initialization was attempted after project-root resolution but the executable is unavailable on `PATH`; scoped direct inspection was used.
- Parent owns attempt settlement and lifecycle closure; no authority token is persisted. No Task 7–8, application, Worker/API, dependency/lock, style, remote, provisioning, deployment, commit, push, PR, or review work was performed.

## Task 7 confirmed-point complaint form

### Completed work

- [x] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->
  - Added an accessible anonymous local/synthetic form with one required allowed photo, optional 500-code-point description, and optional private WhatsApp field.
  - A candidate requires a separate confirmation; every map movement clears that confirmation. GPS remains nonblocking through the existing map seam.
  - One UUID stays with an unchanged retry; a changed field or candidate after a retryable failure rotates it. Submitting disables the control, and success renders only the Pending receipt and disclaimer.
  - The retained non-official-channel warning is prominent; private inputs are cleared after success and never appear in the receipt.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 7. Complaint form | `e2e/smoke.spec.ts` | Chromium / preview / Portless / workerd | 6/6 E2E | Confirmation button absent: 7th scenario failed | Form flow passed 7/7 after App/styles implementation | Added missing-photo disabled-state assertion; 7/7 passed | Extracted retry state synchronization; scoped Biome and 7/7 passed |

### Verification evidence

- `pnpm test` — passed, 2 files / 36 tests.
- `pnpm typecheck` — passed.
- `pnpm exec biome check src/App.tsx src/styles.css e2e/smoke.spec.ts` — passed.
- `pnpm build && pnpm test:e2e` — fresh build passed (existing MapLibre chunk-size warning only); real local E2E passed 7/7. The test routes the first actual workerd response to a retryable browser failure, then retries retained form data to the same local D1/R2 receipt.
- `git diff --check` — passed. A full `pnpm lint` also surfaced pre-existing/out-of-scope formatting findings in `.pi/gentle-ai/sdd-preflight.json` and `worker/data/ign-06182.json`; neither was modified under this Task 7 boundary.

Runtime boundary: Chromium exercised preview → Portless → workerd → local D1/private R2. OSM tiles remained locally intercepted by the existing shared guard. Remote/deployed resources, production durability, and production OSM availability are **N/A**.

### Files changed

- `src/App.tsx`
- `src/styles.css`
- `e2e/smoke.spec.ts`
- `openspec/changes/add-pending-complaint-intake/tasks.md`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining tasks and lifecycle

- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->
- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status, workload, and action context

- Consumed authoritative `applyState=ready` for `add-pending-complaint-intake`; repo-local `/Users/nicolasmateoippoliti/dev/la-cuenta-pendiente` was the only edit root.
- Delivery is `ask-on-risk` → `chained` → `stacked-to-main`, branch `feat/pending-complaint-form`, Task 7 only, canonical 400-line budget, no exception. Source/test diff is 337 changed lines before required artifacts.
- CodeGraph initialization was attempted after root resolution, but its executable and MCP intelligence tool were unavailable; scoped inspection was used. No Worker/API, map, dependency, migration, network, delivery, review, commit, push, or PR work occurred.

## Task 7 complaint-form correction

### Corrected behavior

- Removed the browser `maxLength` constraint, which counts UTF-16 code units, and retained the explicit `Array.from(description).length` code-point validation. The description now exposes an accessible live `N/500 caracteres.` count.
- FormData sends trimmed optional description and WhatsApp values, matching the server normalization used to fingerprint a submission.
- Added a synchronous `submitInFlight` guard and a frozen mutable form region while a request is active: native controls are disabled, the region is inert, and the map surface has no pointer events. Map, file, description, WhatsApp, confirmation, and submit paths also reject late/programmatic mutation while that guard is set.
- Kept the MapLibre callback stable without manual memoization so a normal candidate update does not recreate the imperative map and discard its marker.
- The browser test captures the multipart requests sent to the actual local endpoint. It proves 500 supplementary Unicode code points are accepted client-side, 501 are rejected, in-flight map/input/second-submit attempts leave one request, the retry has identical UUID/normalized scalar values/filename/bytes, the initial accepted receipt is returned as retry `200`, and post-success reset produces a new key.
- Task 7 was already persisted as complete; `tasks.md` was re-read and still visibly contains `- [x] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->`. No Task 8 or parent-owned checkbox was changed.

### TDD Cycle Evidence

| Work unit | Test file | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| `complaint-form-correction` | `e2e/smoke.spec.ts` | Fresh local E2E failed because `maxlength="500"` truncated 501 supplementary characters to 250 code points. | Removed `maxLength`, added code-point feedback, frozen mutable region, submit guard, stable map callback, and multipart capture. | The real local browser/workerd scenario covers 500/501 boundaries, attempted in-flight input/map/re-entry mutation, unchanged retry bytes/fields/UUID, first `201` receipt/retry `200` same receipt, and success key rotation. | Corrected the conditional `inert` attribute (false must omit it), stabilized the imperative map callback, and formatted the three scoped files. |

### Verification evidence

- RED: `pnpm test:e2e` — 6/7 passed; the new browser assertion failed at the old UTF-16 `maxlength` behavior exactly as expected.
- `pnpm test` — passed, 2 files / 36 tests.
- `pnpm typecheck` — passed.
- `pnpm build && pnpm test:e2e` — fresh build passed with the existing MapLibre chunk-size warning; the real local preview → Portless → workerd → local D1/private-R2 suite passed 7/7. OSM tile traffic remained locally intercepted by the shared test guard.
- `pnpm exec biome check src/App.tsx src/styles.css e2e/smoke.spec.ts` — passed after scoped formatting.
- `git diff --check` — passed before the required artifact update; rerun after persistence below.

Runtime boundary: this browser evidence proves the client behavior plus the real local endpoint/D1/R2 receipt contract. It does not prove remote/deployed resources, production durability, production OSM availability, or production operations; those are **N/A**.

### Files changed

- `src/App.tsx`
- `src/styles.css`
- `e2e/smoke.spec.ts`
- `openspec/changes/add-pending-complaint-intake/apply-progress.md`

### Remaining tasks and deferred lifecycle

- [ ] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->
- [ ] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. <!-- sdd-owner: parent -->

### Structured status, workload, and action context

- Consumed the authoritative native status: `changeName=add-pending-complaint-intake`, `artifactStore=openspec`, `applyState=ready`, and repo-local root `/Users/nicolasmateoippoliti/dev/la-cuenta-pendiente` as the only allowed edit root.
- Delivery remains `stacked-to-main`. The user explicitly accepted the candidate-specific `size:exception` if the final diff exceeds 400; the active correction objective has the native 500-line budget. No delivery action, commit, push, PR, review, remote operation, or external-network request occurred.
- A parent-owned active correction attempt was continued for the required runtime evidence. Parent owns settlement; no opaque authority value is recorded here.
- CodeGraph initialization was attempted after root resolution and failed because the `codegraph` executable is unavailable on `PATH`; scoped direct inspection was the documented fallback.
