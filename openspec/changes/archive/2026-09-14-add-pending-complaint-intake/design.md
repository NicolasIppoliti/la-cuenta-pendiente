# Design: Add Pending Complaint Intake

## Design summary

Add one private write-only intake route, `POST /api/complaints`, behind the existing Worker `/api/*` seam. A deep intake module owns multipart parsing, trust-boundary validation, pinned-territory checks, idempotency, and D1/R2 coordination. The React client owns only form interaction, explicit map confirmation, optional GPS assistance, and presentation of static, non-private outcomes.

The persistence protocol is deliberately recovery-based rather than transaction-like: reserve one D1 row, write the original to one deterministic private R2 key, then mark the row complete. Retries use a client-generated idempotency key and a server-computed request fingerprint to resume the same logical submission without creating another row or object. There is no distributed transaction, compensating delete, public read route, background reconciler, or new framework.

This is local/synthetic design only. It does not select production services or authorize deployment, remote migrations, real data, production OSM tiles, Turnstile, publication, moderation, derivatives, or authentication.

## Existing seams retained

- `src/App.tsx` remains the browser entry interface. No router or state library is introduced.
- `worker/index.ts` remains the Worker routing interface. Exact `GET /api/health`, health method rejection, and JSON 404 behavior remain unchanged.
- Existing local-only `DB` and `PRIVATE_IMAGES` bindings remain the only persistence adapters.
- Vite preview plus Portless plus workerd remains the real local integration seam.
- Playwright remains the browser seam; Vitest remains the request/domain seam.

Routing order in `worker/index.ts` is explicit:

1. Handle exact `/api/health` with its current behavior.
2. Handle exact `/api/complaints`; only `POST` is allowed.
3. Return the current `{ "error": "Not found" }` JSON 404 for every other path.

No complaint GET route or R2-serving route is added.

## Modules and interfaces

### 1. Complaint intake module

**Seam:** `worker/complaint-intake.ts`

**External interface:**

```ts
handleComplaintIntake(request: Request, env: Env): Promise<Response>
```

This is the deep module called by the router. It hides:

- strict multipart parsing;
- scalar and photo validation;
- allowed-image identification;
- coordinate parsing and territory enforcement;
- request fingerprinting;
- D1 reservation and lookup;
- deterministic private R2 storage;
- completion and retry behavior; and
- conversion of expected failures into private JSON responses.

`Env` contains only the existing `DB: D1Database` and `PRIVATE_IMAGES: R2Bucket` bindings. It is declared locally in Worker code; generated binding tooling is not added.

The implementation may use these **internal seams**, kept out of the router interface:

```ts
interface PendingIntakeStore {
  reserve(input: ReservedComplaint): Promise<Reservation>;
  complete(complaintId: string, completedAt: string): Promise<void>;
}

interface PrivateOriginalStore {
  put(key: string, bytes: ArrayBuffer, metadata: OriginalMetadata): Promise<void>;
}
```

There are two justified adapters at each seam: the D1/R2 adapters used by workerd and small deterministic in-memory failure adapters used only by coordinator tests. The external intake interface does not expose storage sequencing.

`reserve` performs `INSERT ... ON CONFLICT(idempotency_key) DO NOTHING`, then reads the unique row. It returns either the newly/existing staged row or the existing complete row. A stored fingerprint mismatch is a conflict, never a retry.

The coordinator receives `now` and UUID generation as internal injected functions for deterministic tests. Production adapters use platform time and `crypto.randomUUID()`. These are not application-wide abstractions.

### 2. Pinned territory module

**Seam:** `worker/territory.ts`

**Interface:**

```ts
coversRosales(point: readonly [longitude: number, latitude: number]): boolean
```

The module imports one pinned local fixture and hides GeoJSON traversal. It implements polygon `covers` semantics:

1. reject non-finite or out-of-range coordinates;
2. return true when the point lies on any outer or hole-ring segment;
3. otherwise require the point to be inside the outer ring; and
4. reject points inside a hole.

Boundary comparison uses only a scale-aware floating-point roundoff allowance derived from `Number.EPSILON`; it does not buffer the polygon or add a geographic distance tolerance. The acceptance territory is therefore not intentionally expanded.

The fixture at `worker/data/ign-06182.json` contains one Feature plus metadata in one versioned document:

- IGN source URL and publisher;
- source feature id `352`;
- `CODINDEC` `06182`;
- source name;
- EPSG `4326`;
- retrieval date; and
- the exact pinned Polygon coordinates.

Runtime code never fetches IGN. Fixture refresh and production-freshness policy remain outside this change.

### 3. Map selection module

**Seam:** `src/ComplaintMap.tsx`

**Interface:**

```ts
type Point = { longitude: number; latitude: number };

<ComplaintMap selected={point} onSelect={setPoint} />
```

The module hides MapLibre setup, marker movement, local raster style, teardown, and optional geolocation control. It reports a point only after a human map click. GPS may recenter the map but does not set the submitted point and never sets confirmation. Unsupported, denied, timed-out, or failed GPS produces a nonblocking hint and leaves map clicking available.

`App` owns an explicit confirmation action. Selecting or moving the point clears prior confirmation; only confirming the currently selected point sets `locationConfirmed=true`. The form cannot submit merely because GPS or a previous marker supplied coordinates.

The standard OSM raster source is configured only when the browser hostname is `localhost` or ends in `.localhost`. It uses ordinary viewport-driven MapLibre loading, retains normal Referer/caching behavior, and enables visible `© OpenStreetMap contributors` attribution. No prefetch, bulk, offline, cache-bypass, production fallback, token, or alternate provider is added. On any other hostname the client does not request standard OSM tiles and states that the local basemap is unavailable; this design does not choose a production provider.

## HTTP intake contract

### Request

`POST /api/complaints` requires `multipart/form-data` with these exact singleton fields:

| Field | Form value | Rule |
|---|---|---|
| `idempotencyKey` | string | canonical UUID generated by the browser and retained unchanged for retries |
| `longitude` | decimal string | finite and within `[-180, 180]` |
| `latitude` | decimal string | finite and within `[-90, 90]` |
| `locationConfirmed` | string | must be exactly `true` |
| `photo` | `File` | exactly one, non-empty, at most 15 MiB, allowed format |
| `description` | string, optional | at most 500 Unicode code points |
| `whatsapp` | string, optional | private opaque text; trim surrounding whitespace, omit when empty |

Duplicate singleton fields, unknown fields, malformed values, missing required fields, and more than one `photo` are rejected. Client checks mirror these rules for usability but are not authoritative.

The server identifies JPG/JPEG, PNG, WebP, HEIC, and HEIF from bounded file-header/container signatures rather than trusting the browser filename or MIME declaration. HEIC/HEIF inspection stops at identifying an allowed ISO-BMFF brand. It does not decode pixels, transform content, inspect or remove EXIF/GPS, validate publication safety, or generate derivatives. After identification, every accepted format is stored byte-for-byte as an opaque private original.

The implementation checks `File.size` before reading bytes. `request.formData()` remains the platform multipart parser; no streaming-parser dependency is introduced. An obviously excessive declared `Content-Length` may be rejected early, but exact enforcement remains the parsed file's 15 MiB limit because multipart overhead is variable.

### Success

- `201` when the attempt completes a new or previously staged intake.
- `200` when the same idempotency key and fingerprint already identify a complete intake.

Both return only:

```json
{ "complaintId": "server-generated UUID", "status": "Pending" }
```

The response has no coordinates, contact value, description, object key, filename, or public URL.

### Errors

Intake errors use JSON with a stable static code and message, for example:

```json
{ "error": { "code": "outside_territory", "message": "The submission is invalid." } }
```

Expected classes are:

- `400`: malformed multipart, field cardinality/value failures, missing photo, unconfirmed/invalid location, overlong description, or exterior point;
- `413`: photo over 15 MiB;
- `415`: unidentified/disallowed image format;
- `409`: an idempotency key already exists with a different request fingerprint;
- `503`: D1 or R2 could not complete the intake; this is retryable with the same form and key;
- `405`: wrong method on exact `/api/complaints`, with `Allow: POST`.

Messages and logs never interpolate submitted values. Unexpected errors are caught at the intake seam and reduced to `503 intake_unavailable`; logs contain only the failure stage, static category, and server complaint id when one exists. Coordinates, description, WhatsApp, file bytes, filenames, multipart bodies, and object metadata are not logged. Existing health and unknown-route JSON bodies remain byte-for-behavior compatible rather than adopting the new intake envelope.

## Stable idempotency identity

The browser creates one UUID when a fresh form session starts. It keeps that key while a request is in flight and for every retry of the unchanged submission. The submitted values and `File` object are retained in memory after a retryable error. A successful response clears the form and creates a new key. Changing/resetting a failed submission starts a visibly new logical submission with a new key; the UI does not silently reuse an old key for changed content.

The server computes SHA-256 over a versioned canonical encoding of:

- normalized longitude and latitude;
- explicit confirmation;
- description and WhatsApp after the documented normalization;
- identified media format and byte length; and
- the exact original photo bytes.

Length-prefixed UTF-8 fields avoid concatenation ambiguity. The hash version is stored with the fingerprint (for example `v1:<hex>`). The idempotency key is identity; the fingerprint prevents the same key from silently aliasing changed private content. The fingerprint is not a content-deduplication key: two different idempotency keys intentionally create two logical complaints even if their payloads match.

The server-generated complaint id is returned only as a receipt and is not a read credential. R2 uses the deterministic key `pending-originals/v1/{complaintId}`. Retrying can therefore only overwrite the same object, never allocate another evidence key.

## D1 schema

The first forward migration creates one table, `pending_complaints`:

| Column | Purpose |
|---|---|
| `id TEXT PRIMARY KEY` | server-generated complaint UUID |
| `idempotency_key TEXT NOT NULL UNIQUE` | stable logical-submission identity |
| `request_fingerprint TEXT NOT NULL` | detects key reuse with changed content |
| `status TEXT NOT NULL CHECK (status = 'Pending')` | only in-scope lifecycle status |
| `durability_state TEXT NOT NULL CHECK (durability_state IN ('staged','complete'))` | coordination state, not public lifecycle |
| `longitude REAL NOT NULL`, `latitude REAL NOT NULL` | confirmed point |
| `description TEXT NULL` | private optional description |
| `whatsapp TEXT NULL` | private optional contact |
| `photo_key TEXT NOT NULL UNIQUE` | deterministic private R2 key |
| `photo_format TEXT NOT NULL`, `photo_size INTEGER NOT NULL` | validated original metadata |
| `created_at TEXT NOT NULL`, `completed_at TEXT NULL` | intake coordination timestamps |

A `CHECK` also enforces that `completed_at` is present only for `complete`. No moderation columns, publication flags, user table, generalized status history, or public indexes are introduced.

`staged` is an internal incomplete intake, not a successful accepted complaint. Only `complete` may produce success. The product status remains `Pending` throughout; `durability_state` must not be presented as moderation status.

The migration lives at `migrations/0001_pending_complaints.sql`. Its explicit local reversal lives outside Wrangler's forward migration scan at `rollback/0001_pending_complaints.sql` and drops only this table after synthetic R2 cleanup. Neither file is created or applied during design.

## D1/R2 coordination and recovery

For a validated request:

1. Compute the fingerprint and propose a new server complaint id/object key.
2. Reserve via D1. A unique idempotency constraint chooses exactly one row under concurrent requests.
3. Read the winning row.
   - Different fingerprint: return `409` and write nothing.
   - Same fingerprint and `complete`: return its original receipt without writing R2.
   - Same fingerprint and `staged`: continue using its stored id and object key.
4. `PUT` the exact bytes to the stored private R2 key. Set only normalized content type and non-sensitive ownership metadata (`flow=pending-intake-v1`, complaint id). Do not store contact, coordinates, description, or original filename in R2 metadata.
5. Mark the D1 row `complete` with a conditional update for that id/fingerprint.
6. Return success only after step 5 succeeds.

Recovery properties:

- D1 reservation failure occurs before any R2 write and returns non-success.
- R2 failure leaves one `staged` row; retry repeats the same deterministic PUT and can complete it.
- An R2 success with an unknown/failed D1 completion leaves at most one object and one staged row; retry overwrites that same key, then completes D1.
- A lost response after completion is answered from the complete D1 row with the same receipt.
- Concurrent identical attempts may PUT identical bytes to the same key, but the unique row and deterministic key prevent duplicate durable entities.
- No request deletes an object as compensation: delete-after-unknown-outcome could remove evidence written by a concurrent successful retry.

There is no automatic stale-row sweeper in this slice. A staged row truthfully records an incomplete attempt and remains recoverable by the same retry. Operational reconciliation, retention, and abandonment policy require later product decisions.

## Client flow

1. Render the retained “not an official municipal channel” warning prominently and state local/synthetic use only.
2. Let the user click the real MapLibre map to choose a candidate point; GPS can only recenter.
3. Require a separate confirmation action for the current candidate.
4. Collect exactly one photo plus optional description and WhatsApp.
5. Build `FormData` in `App` and submit with the current idempotency key. Do not place private values in URLs, analytics, or logs.
6. While submitting, prevent double-click submission. On a retryable failure, retain the same values, file, and key and offer retry. On validation failure, let the user edit; editing starts a new logical key before resubmission.
7. On success, display only the receipt id and `Pending`, explaining that this does not mean official receipt, review, publication, or municipal delivery.

No client repository abstraction is added for one endpoint. `App` may own the fetch call directly; `ComplaintMap` is split only because it owns an imperative MapLibre lifecycle.

## Strict-TDD seams and evidence

Implementation proceeds as vertical RED-GREEN slices; no bulk test-first pass and no implementation-coupled call-count tests.

### Vitest: domain/request seams

Use `tests/worker.test.ts` for the public Worker request seam and add `tests/complaint-intake.test.ts` only for the two high-risk internal interfaces.

1. **Territory interface:** fixed known literals from the pinned fixture prove one interior point, one exact fixture-segment boundary point, one exterior point, and a hole case only if the fixture actually contains a hole. Expected points are committed literals, not recomputed by the implementation.
2. **Coordinator interface with in-memory adapters:** one tracer sequence covers R2 failure after D1 reservation and retry to completion; a second covers completion followed by a lost response/retry returning the same id. The adapters model observable store outcomes, not internal call counts.
3. **Worker request interface:** representative multipart cases prove server authority: one valid request; a table for missing/multiple/oversized/disallowed photo; one overlong description; unconfirmed and exterior locations; same-key/different-content conflict; and static private error bodies. Do not repeat every coordinate/photo permutation already proved at a deeper seam.
4. Retain the current health and unknown-route tests unchanged in intent, adding only `/api/complaints` method behavior.

The pure/coordinator tests use injected adapters because deterministic storage-failure timing cannot be safely induced through local R2/D1. They do not claim Cloudflare compatibility.

### Playwright/workerd: real boundaries

Use the existing preview/Portless harness with local migrations applied before workerd starts.

- One request-level Playwright test posts a small committed synthetic image through real workerd, D1, and private R2; retrying the same multipart body/key must return the same complaint id. This is the real D1/R2 binding and multipart evidence. It does not inspect private records through a new HTTP endpoint.
- One Chromium flow uses real MapLibre, denies geolocation, manually clicks and confirms a point, attaches a synthetic image, submits through workerd to real local D1/R2, and observes `Pending`. It also verifies the non-official warning and visible OSM attribution. Automated tile traffic is intercepted with a tiny local tile response so tests do not consume the standard OSM service; MapLibre itself is not mocked.
- Keep the existing health, JSON unknown-API, SPA fallback, and narrow-layout evidence. Update only landing copy assertions made obsolete by intake.

These browser scenarios overlap only at the successful intake needed to prove each distinct seam: the first proves retry identity through real storage; the second proves human map confirmation/GPS degradation through the browser and real Worker path. Validation matrices and partial-failure sequences stay in Vitest and are not duplicated in Playwright.

No new public inspection endpoint is added to assert D1/R2 internals. Real binding evidence comes from an endpoint whose success contract is implemented only after both writes; exact failure-state transitions are proven separately at the coordinator seam.

### Local harness

`scripts/e2e.mjs` (or a narrowly named package script called by it) applies pending Wrangler D1 migrations with `--local` before starting Vite/workerd, using the same local persistence root as the plugin. The implementation phase must first verify the exact Wrangler command against the pinned Wrangler version; design does not run it. Tests use synthetic data and ignored `.wrangler/` state only. No remote flag, remote database id, bucket provisioning, or deployment command is allowed.

After each vertical slice, run the focused Vitest file. Final evidence expands once to `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test:e2e`.

## Exact file impact

### Modify

- `package.json` — add only `maplibre-gl`; optionally add one local migration script if the verified Wrangler command is not kept inside the runner.
- `pnpm-lock.yaml` — lock the approved MapLibre dependency.
- `src/App.tsx` — form state, confirmation, multipart submit, static private outcomes, and retained warning.
- `src/styles.css` — MapLibre CSS import/container sizing and bounded form/map styles.
- `worker/index.ts` — exact intake route and typed binding handoff; preserve health/404 branches.
- `wrangler.jsonc` — declare `migrations_dir` only if Wrangler does not use the chosen default; keep both bindings `remote: false`.
- `scripts/e2e.mjs` — apply the local migration before workerd for dev/preview/test evidence, without touching remote resources.
- `tests/worker.test.ts` — preserve compatibility tests and add request-level intake coverage where it fits.
- `e2e/smoke.spec.ts` — update obsolete landing assertions and add bounded real browser/workerd evidence.
- `README.md` — document local synthetic intake, migration startup, opaque private originals, local-only OSM policy, and exclusions.

### Add

- `src/ComplaintMap.tsx` — imperative MapLibre/manual-selection module.
- `worker/complaint-intake.ts` — deep multipart, validation, idempotency, adapters, coordination, and response module.
- `worker/territory.ts` — pinned `covers` implementation.
- `worker/data/ign-06182.json` — exact polygon and source/retrieval metadata.
- `migrations/0001_pending_complaints.sql` — one forward local D1 schema migration.
- `rollback/0001_pending_complaints.sql` — explicit local-only schema reversal, outside the forward scan.
- `tests/complaint-intake.test.ts` — territory and partial-failure/retry seam tests.
- `e2e/fixtures/synthetic.jpg` — tiny non-personal test original if an existing programmatic binary fixture cannot be used cleanly.

No other files, packages, migrations, fixtures, routes, resources, or configuration are planned. During implementation, an exact Wrangler limitation may move the migration invocation between `package.json` and `scripts/e2e.mjs`, but must not expand the behavior.

## Rollout and rollback

There is no production rollout. Local implementation order is:

1. pin fixture and territory behavior;
2. add forward/reversal SQL and local migration startup;
3. add coordinator and Worker route;
4. add client form/map;
5. add real local evidence and documentation.

Rollback is dependency-aware:

1. Stop local workerd and retain or deliberately discard synthetic data.
2. Enumerate `photo_key` values owned by `pending_complaints` and delete those private local R2 objects, additionally constrained to `pending-originals/v1/` and ownership metadata. Do not delete the bucket or unrelated objects.
3. Apply `rollback/0001_pending_complaints.sql` locally to drop only the intake table.
4. Remove the complaint route/module, territory module/fixture, map/form, migration startup, and intake tests.
5. Remove `maplibre-gl` and update the lockfile.
6. Restore landing documentation/copy while keeping the non-official-channel warning.
7. Re-run health, health method rejection, unknown JSON API routes, SPA fallback, build, and browser smoke tests.

Because there are no remote resources or production data in scope, rollback must not invoke remote Wrangler, provisioning, deployment, or bucket/database deletion.

## Rejected alternatives

- **R2 first, then D1:** rejected because a D1 outage would create an object with no durable recovery identity.
- **Compensating R2 deletes:** rejected because an unknown write outcome or concurrent retry could make deletion destroy the only valid original.
- **Hash-only idempotency/content deduplication:** rejected because two intentional complaints may contain identical content; client identity plus fingerprint models retries without collapsing user intent.
- **Deriving trust from filename or MIME only:** rejected; bounded signature identification is required, while still making no decode or sanitization claim.
- **A distributed-transaction abstraction, queue, workflow engine, or sweeper:** rejected as unnecessary for this local recoverable two-write protocol.
- **A public/local debug read endpoint:** rejected because it would violate the write-only privacy shape merely to simplify tests.
- **GPS-selected automatic confirmation:** rejected because GPS is optional assistance and explicit human confirmation is authoritative.
- **Production OSM fallback or tile-provider selection:** rejected as outside authorized scope.

## Review-budget gate

The expected implementation touches UI, Worker/domain code, a geographic fixture, D1/R2 coordination, a dependency/lockfile, and two test layers. It is very likely to exceed the canonical 400 changed-line review budget, especially because the pinned polygon and lockfile are large even before authored logic.

Under `ask-on-risk`, the next planning/delivery step must pause and request a user-owned choice before implementation proceeds. This design does not choose a chain strategy, infer a single oversized PR, or infer `size:exception`.
