# Tasks: Add Pending Complaint Intake

This is an implementation plan only. It does not authorize implementation, dependency installation, migration application, provisioning, deployment, commit, or push. Execute the units in dependency order, one vertical slice at a time, using strict RED → GREEN → TRIANGULATE → REFACTOR. No delivery shape is selected by this artifact.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,000–1,600 authored lines, excluding uncertain lockfile churn; the pinned polygon fixture and dependency lockfile add review surface beyond the estimate |
| 400-line budget risk | High |
| Chained PRs recommended | Yes — recommendation only; no chain is selected |
| Suggested split | Candidate review slices: territory/data → API/durability → map/UI → evidence/docs; delivery split remains pending user choice |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

The forecast crosses the canonical 400 authored changed-line budget because the scope spans a new UI/map dependency, Worker validation and routing, D1/R2 recovery, a geographic fixture and migration, two test layers, harness changes, and documentation. Under `ask-on-risk`, the parent must pause before apply and obtain the user's delivery decision; this plan does not choose chaining, `size:exception`, or a single oversized delivery.

## Boundaries for every unit

- Keep the existing `/api/health`, unknown-API JSON 404, SPA fallback, local-only bindings, and non-official-channel warning intact.
- Keep complaint data and original photos private; add no public read route, debug endpoint, moderation, publication, Turnstile, production tile provider, remote resource, or production claim.
- Use only the allowed edit surfaces named by each unit. Any discovered need for another surface is a scope stop, not an invitation to expand the plan.
- Do not claim D1/R2, browser, workerd, or OSM behavior from direct Vitest tests; record the real harness evidence only in the unit that runs it.

## Implementation Work Units

### 1. Pin the territory and prove `covers` semantics

- [x] Implement and verify the pinned Rosales territory seam. <!-- sdd-owner: implementation -->

**Start:** No complaint-domain implementation exists; research and design have fixed IGN Feature 352 / CODINDEC `06182`, EPSG:4326, and the retrieval metadata requirement.

**RED:** In `tests/complaint-intake.test.ts`, add literal-point tests for an interior point, an exact fixture-segment boundary point, and an exterior point. Add a hole case only if the pinned fixture contains a hole; do not derive expected points with the implementation.

**GREEN:** Add `worker/data/ign-06182.json` with the exact pinned Polygon and source/publisher, feature id, CODINDEC, CRS, and retrieval metadata. Add `worker/territory.ts` exposing `coversRosales(point)` with finite/range checks, boundary inclusion, hole exclusion, and only scale-aware floating-point roundoff (no geographic buffer).

**TRIANGULATE:** Focused command: `pnpm exec vitest run tests/complaint-intake.test.ts -t territory`. Runtime harness: **N/A** — this is a pure geometry seam and does not prove Cloudflare bindings or freshness of the live IGN source.

**REFACTOR:** Simplify only local geometry helpers after the focused tests are green; retain the public seam and fixture metadata.

**Finish:** The focused tests prove interior/boundary/exterior behavior and the fixture is self-describing; no runtime IGN fetch exists.

**Rollback boundary:** Remove `worker/territory.ts`, `worker/data/ign-06182.json`, and only the territory tests from `tests/complaint-intake.test.ts`; no database or object state exists in this unit.

**Allowed edit surfaces:** `worker/territory.ts`, `worker/data/ign-06182.json`, `tests/complaint-intake.test.ts`.

### 2. Add the reversible local D1 schema and migration startup seam

- [x] Implement and verify the local Pending schema without touching remote resources. <!-- sdd-owner: implementation -->

**Start:** Unit 1 is green; the schema contract in `design.md` is unchanged and local-only D1/R2 bindings already exist.

**RED:** Add a focused schema expectation to `tests/worker.test.ts` or the existing local harness check that requires `pending_complaints`, its unique idempotency key, Pending-only status, staged/complete coordination state, and completion consistency. The check must fail before the migration is present.

**GREEN:** Add `migrations/0001_pending_complaints.sql` and `rollback/0001_pending_complaints.sql` with only the specified table and constraints. Update `scripts/e2e.mjs` and, only if verified necessary, `wrangler.jsonc` to apply pending migrations with the pinned Wrangler version and `--local` before workerd starts. Verify the exact command with `pnpm exec wrangler --version` before using it; do not guess a Wrangler invocation.

**TRIANGULATE:** Focused command: `pnpm exec vitest run tests/worker.test.ts -t "pending_complaints migration"` plus the verified local migration command in the existing E2E runner. Runtime harness evidence: local Wrangler D1 only, using the same ignored `.wrangler/` persistence root as preview/workerd; explicitly record **N/A** for remote D1, provisioning, and deployment.

**REFACTOR:** Keep migration startup narrowly scoped to local E2E startup; remove duplicate schema assertions rather than adding a migration framework.

**Finish:** A fresh local run applies the forward migration, the schema expectation passes, and the explicit reversal drops only `pending_complaints` after synthetic R2 cleanup.

**Rollback boundary:** Stop local workerd, delete only synthetic intake objects when they exist, run `rollback/0001_pending_complaints.sql` locally, then revert the migration-startup edits. Never use a remote flag or delete a bucket/database.

**Allowed edit surfaces:** `migrations/0001_pending_complaints.sql`, `rollback/0001_pending_complaints.sql`, `scripts/e2e.mjs`, `wrangler.jsonc` only if required, `tests/worker.test.ts`.

### 3. Build the recoverable D1/R2 coordinator at its internal seam

- [x] Implement and verify reservation, deterministic private-object recovery, and idempotent completion. <!-- sdd-owner: implementation -->

**Start:** Units 1–2 are green; the schema is available conceptually, but no intake route is exposed.

**RED:** In `tests/complaint-intake.test.ts`, add two behavior tests through injected deterministic adapters: (a) R2 failure after D1 reservation leaves one staged logical submission and a same-key retry completes it; (b) completion followed by a lost response returns the same receipt without a second logical record/object. Add a same-key/different-fingerprint conflict assertion if it is needed to pin the public outcome.

**GREEN:** Add the coordinator portion of `worker/complaint-intake.ts` and its narrow internal `PendingIntakeStore` / `PrivateOriginalStore` seams. Reserve by unique idempotency key, persist the server id/object key, PUT exact opaque bytes to `pending-originals/v1/{complaintId}`, conditionally mark complete, and return only the documented receipt. Inject time/UUID only inside this module; do not add an application-wide abstraction.

**TRIANGULATE:** Focused command: `pnpm exec vitest run tests/complaint-intake.test.ts -t "retry|partial|idempotency"`. Runtime harness: **N/A for Cloudflare compatibility** — in-memory adapters intentionally prove coordinator recovery timing only; real D1/R2 evidence is deferred to Unit 5.

**REFACTOR:** Remove call-count assertions and keep tests at observable adapter outcomes; preserve no-compensating-delete behavior for unknown R2 outcomes.

**Finish:** Tests prove one stored identity, deterministic key reuse, truthful non-success before completion, and convergence after retry.

**Rollback boundary:** Remove coordinator code and its focused tests; leave the migration files untouched so schema rollback remains Unit 2's boundary.

**Allowed edit surfaces:** `worker/complaint-intake.ts`, `tests/complaint-intake.test.ts`.

### 4. Connect the Worker route and server-side trust-boundary validation

- [x] Implement and verify the write-only `POST /api/complaints` contract. <!-- sdd-owner: implementation -->

**Start:** The territory, schema, and coordinator seams are green; existing health and unknown-route tests remain in their original intent.

**RED:** Extend `tests/worker.test.ts` at the direct Worker request seam with multipart cases for one valid request, missing/multiple/oversized/disallowed photo, overlong description, unconfirmed location, exterior location, same-key/different-content conflict, static private errors, wrong method, and preservation of health/unknown-API JSON behavior. Do not repeat every permutation already covered by the territory/coordinator seams.

**GREEN:** Complete `worker/complaint-intake.ts` request parsing and validation: exact singleton fields, UUID identity, normalized optional fields, bounded file-header identification for JPG/JPEG/PNG/WebP/HEIC/HEIF, 15 MiB limit, explicit confirmation, territory enforcement, fingerprinting, and static error responses. Update `worker/index.ts` routing in the required order, preserving exact health behavior and JSON 404 behavior. Keep all submitted private values out of logs, URLs, responses, and error details.

**TRIANGULATE:** Focused command: `pnpm exec vitest run tests/worker.test.ts -t "complaint intake|health|unknown API"`. Runtime harness evidence: direct Worker fetch-handler seam with deterministic test bindings; explicitly **N/A** for real workerd, local D1/R2 durability, and browser behavior until Unit 5/7.

**REFACTOR:** Consolidate only duplicated validation/error helpers inside the intake module; keep the router thin and add no public complaint GET path.

**Finish:** Invalid client-bypass requests cannot be accepted, valid requests reach the coordinator, responses are private JSON, and compatibility tests remain green.

**Rollback boundary:** Revert the `/api/complaints` route and intake request layer plus only its new direct-request assertions; do not remove the schema or territory fixture until their dependent units are rolled back.

**Allowed edit surfaces:** `worker/index.ts`, `worker/complaint-intake.ts`, `tests/worker.test.ts`.

### 5. Prove real local D1/R2 durability and retry through workerd

- [x] Implement and verify the real local storage boundary for one synthetic intake. <!-- sdd-owner: implementation -->

**Start:** Unit 4's direct Worker contract is green and Unit 2's local migration startup command is verified.

**RED:** Add one request-level Playwright scenario in `e2e/smoke.spec.ts` that posts a committed small synthetic image and the same multipart fields/idempotency key twice, expecting the first success and the same complaint id on retry. Keep inspection write-only; do not add a debug/read endpoint.

**GREEN:** Fix only integration defects needed for the existing preview/Portless/workerd path to run the already-designed D1/R2 adapters and migration startup. Add `e2e/fixtures/synthetic.jpg` only if a programmatic binary cannot provide a stable non-personal original.

**TRIANGULATE:** Focused command: `pnpm exec playwright test e2e/smoke.spec.ts -g "private.*retry|intake.*retry"`. Runtime harness evidence required: real Vite preview → Portless → workerd → local D1 and private R2, with local migrations applied first. This proves local bindings and multipart/retry behavior only; record **N/A** for deployed resources, production durability, and production operations.

**REFACTOR:** Remove duplicated browser setup and retain one storage-retry scenario; do not expose private records for assertions.

**Finish:** Workerd returns success only after both writes, retry returns the original receipt, and no duplicate entity is observable through the response contract.

**Rollback boundary:** Remove the scenario/fixture and integration-only edits, then use Unit 2's local cleanup and reversal if local synthetic state was created.

**Allowed edit surfaces:** `e2e/smoke.spec.ts`, `e2e/fixtures/synthetic.jpg` only if necessary, `scripts/e2e.mjs`, `worker/complaint-intake.ts`, `worker/index.ts`.

### 6. Add the manual MapLibre selection seam with nonblocking GPS

- [x] Implement and verify explicit manual point selection and local-only mapped attribution. <!-- sdd-owner: implementation -->

**Start:** The API and real local persistence path are green; no browser map dependency is installed during this planning phase.

**RED:** Add a focused Chromium scenario in `e2e/smoke.spec.ts` (or the existing browser fixture setup) that denies geolocation, clicks the map, and expects a candidate point plus visible confirmation affordance and `© OpenStreetMap contributors`. Intercept tile requests with a tiny local response so the test does not consume standard OSM service traffic; do not mock MapLibre itself.

**GREEN:** Add only `maplibre-gl` to `package.json`/`pnpm-lock.yaml`, add `src/ComplaintMap.tsx`, and extend `src/styles.css` for the map. Configure standard OSM raster tiles only on `localhost`/`.localhost`, retain attribution and normal request/caching behavior, let clicks set candidates, and make geolocation recenter-only and nonblocking. Do not add a production provider, prefetch, offline cache, or fallback.

**TRIANGULATE:** Focused command: `pnpm exec playwright test e2e/smoke.spec.ts -g "geolocation|map attribution"`. Runtime harness evidence required: Chromium through preview/Portless with real MapLibre; denied/unsupported GPS must leave manual clicking available. Record **N/A** for production tile availability and OSM SLA.

**REFACTOR:** Limit imperative lifecycle cleanup to `ComplaintMap`; do not introduce a router, state library, or generalized map abstraction.

**Finish:** Manual clicks produce candidates, GPS cannot confirm or block intake, local attribution is visible, and non-local hosts do not request standard OSM tiles.

**Rollback boundary:** Remove `src/ComplaintMap.tsx`, its styles/tests, the MapLibre package and lockfile entry, then restore the pre-map landing surface; do not alter Worker or migration state.

**Allowed edit surfaces:** `package.json`, `pnpm-lock.yaml`, `src/ComplaintMap.tsx`, `src/styles.css`, `e2e/smoke.spec.ts`.

### 7. Add the confirmed-point form and truthful client outcomes

- [x] Implement and verify the bounded anonymous form flow. <!-- sdd-owner: implementation -->

**Start:** Units 1–6 are green; the API remains the authority and the map only reports a manually clicked candidate.

**RED:** Add a browser flow proving the warning remains prominent, a candidate cannot submit without a separate confirmation, exactly one allowed photo is required, GPS denial does not block manual confirmation, a retryable failure retains the same key/fields/file, and success displays only the receipt id plus `Pending` with the local/synthetic disclaimer. Keep WhatsApp out of public UI, URLs, logs, and responses.

**GREEN:** Extend `src/App.tsx` with explicit candidate/confirmation state, one-session idempotency key, form fields, client usability checks, multipart `fetch` submission, double-submit prevention, retry retention, changed-content key reset, and static private outcomes. Keep the existing non-official-channel warning visible and unweakened. Extend `src/styles.css` only for the bounded form/map layout.

**TRIANGULATE:** Focused command: `pnpm exec playwright test e2e/smoke.spec.ts -g "complaint intake|manual confirmation|Pending"`. Runtime harness evidence required: real Chromium plus preview/Portless/workerd and local D1/R2; browser validation is not evidence of server-side enforcement, which remains Unit 4's direct request seam.

**REFACTOR:** Remove redundant client checks or duplicated state transitions only after the flow is green; do not add a client repository abstraction for one endpoint.

**Finish:** The browser flow demonstrates human confirmation, nonblocking GPS degradation, truthful success, retry identity, privacy-safe presentation, and preserved warning.

**Rollback boundary:** Revert only the intake UI/state/style changes and their browser assertions; keep the independently useful Worker, territory, migration, and coordinator units available for rollback in their own boundaries.

**Allowed edit surfaces:** `src/App.tsx`, `src/styles.css`, `e2e/smoke.spec.ts`.

### 8. Document the local-only boundary and run the final evidence set

- [x] Implement and verify the documentation and repository-wide acceptance evidence. <!-- sdd-owner: implementation -->

**Start:** Units 1–7 are green and no unresolved test or harness defect is being hidden in documentation.

**RED:** No behavior RED phase applies to this documentation-only unit; record the missing/unsupported claims that must remain explicit, including IGN freshness, opaque HEIC/HEIF handling, no Turnstile, no production OSM authorization, local-only D1/R2, and no production readiness.

**GREEN:** Update `README.md` with local synthetic intake, local migration startup, private opaque originals, visible local OSM attribution/policy, Pending meaning, retry behavior, and exclusions. Do not document deployment, provisioning, real-data intake, or publication.

**TRIANGULATE:** Focused acceptance command: `pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`. Runtime harness evidence: the final E2E portion uses the configured Playwright/preview/Portless/workerd harness; the Vitest/lint/typecheck/build portions do not prove deployed Cloudflare resources or production behavior. Record any unavailable boundary as **N/A**, not as passing evidence.

**REFACTOR:** Remove duplicate README claims and keep evidence statements tied to the seam that actually exercised them; no coverage threshold or CI workflow is added.

**Finish:** All configured checks pass or their bounded limitations are reported, documentation matches the approved exclusions, and the final diff remains within the delivery decision selected at the parent gate.

**Rollback boundary:** Revert only `README.md` and documentation/evidence wording; retain code rollback boundaries from Units 1–7.

**Allowed edit surfaces:** `README.md` and, only for test assertion wording made obsolete by the approved flow, `tests/worker.test.ts` or `e2e/smoke.spec.ts`.

## Parent-owned Gates After Implementation Work

- [x] Before apply, stop and obtain an explicit user-owned delivery decision for the High review-budget forecast; user selected chained delivery with `stacked-to-main`. No `size:exception` was granted. <!-- sdd-owner: parent -->
- [x] After apply, start or reuse one bounded review against the approved delivery shape and verify the OpenSpec lifecycle gate before any archive action. Every delivered slice was independently verified and its native review approved and acknowledged before merge. <!-- sdd-owner: parent -->

## Explicit Non-Goals

No task authorizes installation, remote or production migration application, Cloudflare provisioning, deployment, paid services, Turnstile, production basemap selection, public complaint reads, moderation, publication, authentication, commit, or push.
