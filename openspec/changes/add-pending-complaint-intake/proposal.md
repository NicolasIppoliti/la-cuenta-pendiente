# Proposal: Add Pending Complaint Intake

## Intent

Add a bounded local-development intake flow that lets an anonymous citizen submit one synthetic complaint for a manually confirmed point inside the Partido de Coronel de Marina Leonardo Rosales. A successful submission creates durable, non-public data with status **Pending** and retains its required photo as a private original.

This change establishes only the intake boundary. It does not make the application an official municipal channel, and the existing warning that it is not an official municipal channel must remain visible and unweakened.

## Product outcome

A citizen can:

- choose and explicitly confirm a point on a map;
- optionally use browser GPS as nonblocking assistance;
- attach exactly one required photo;
- optionally provide a description and private WhatsApp contact; and
- submit once and receive a truthful success result only after both complaint data and the private photo are durable.

The resulting complaint remains non-public and **Pending**. Repeating the same submission after a lost response does not create a duplicate complaint or duplicate evidence object.

## Scope

### Included

- Anonymous, local/synthetic complaint intake with no authentication requirement.
- Non-public D1 persistence of a complaint whose initial and only in-scope lifecycle state is **Pending**.
- The first versioned, reversible local D1 migration needed for complaint persistence.
- Exactly one required private photo, no larger than 15 MB, accepted as JPG/JPEG, PNG, WebP, HEIC, or HEIF.
- Private R2 retention of the submitted original. HEIC and HEIF are retained as opaque bytes; this slice makes no claim that any original is decoded, converted, sanitized, stripped of metadata, safe to publish, or suitable for derivatives.
- An optional description limited to 500 characters.
- An optional WhatsApp value retained as private complaint data.
- A manually selected and explicitly confirmed point. Browser GPS may assist selection but denial, unavailability, timeout, or failure must not prevent manual selection.
- Territory validation against a versioned local copy of the official IGN partido polygon for CODINDEC `06182`, including source URL, source identity, coordinate reference, and retrieval date metadata.
- `covers` territory semantics: accept points in the polygon interior and points on its boundary; reject exterior points.
- The minimal MapLibre dependency needed for point selection.
- Standard OpenStreetMap raster tiles only in constrained, human-driven local development, with visible OpenStreetMap contributor attribution and compliance with the tile usage policy.
- Durable D1 and private R2 persistence before returning success.
- Idempotent retry behavior for the same logical submission, including retry after the server stored it but the client lost the response.
- Server-side enforcement of all trust-boundary rules, while browser validation may provide earlier feedback.
- Preservation of existing health behavior and JSON handling for API errors and unknown API routes.

### Explicitly excluded

- Moderation, review, approval, rejection, or any other complaint lifecycle workflow.
- Publication or any public complaint map, list, detail, marker, status, or aggregate count.
- A production tile or basemap provider, and authorization of OSM standard tiles for production use.
- Real Turnstile protection, credentials, Siteverify integration, hostname/action checks, monitoring, rate limiting, or broader abuse controls.
- Image conversion, decoding guarantees, sanitization, metadata removal, derivatives, thumbnails, or publication.
- Production guarantees about the freshness of the IGN boundary.
- Real-person or real-complaint intake; this slice is limited to local synthetic data.
- Authentication, accounts, authorization roles, or identity verification.
- Cloudflare resource provisioning, remote schema application, deployment, paid services, or production operations.
- Unrelated cleanup, frameworks, state libraries, repository abstractions, or future-proofing.
- Specifications, design, tasks, implementation, commits, or pushes as part of this proposal phase.

## Business rules and boundaries

### Pending and non-public

`Pending` means the complaint has been durably received but has not been moderated, validated by an authority, published, or sent to the municipality. Neither complaint records, coordinates, contact details, nor photos receive a public read path in this change.

### Territory

The accepted territory is the pinned official IGN Feature 352 for **Partido de Coronel de Marina Leonardo Rosales**, identified by CODINDEC `06182`, sourced from the IGN departments/partidos layer in EPSG:4326. The application accepts interior and boundary points using `covers` semantics. Any numerical tolerance may address floating-point robustness only and must not intentionally expand the territory.

The fixture records retrieval metadata because the upstream layer exposes no exact polygon dataset version or edit timestamp. The pinned fixture is adequate for this local slice, not evidence of production freshness.

### Photo evidence

A submission requires one file of an allowed format and at most 15 MB. The original remains private in R2. In particular, accepting HEIC or HEIF means opaque private retention only. No accepted format is thereby declared sanitized or publishable.

### Location confirmation

The manually confirmed point is authoritative for submission. GPS is optional assistance and cannot submit or replace explicit confirmation by itself.

### Truthful success and retries

Success means the complaint record and its private original are both durably stored. A partial write, validation failure, or storage failure must not be reported as success. A stable idempotency identity must make a retry converge on the original logical submission rather than create another complaint or evidence object. The exact partial-failure sequencing and recovery mechanism belong in design, but must preserve these observable guarantees.

## Affected areas

- `src/App.tsx` and local styling: replace or extend the static landing with the bounded intake experience while retaining the non-official-channel warning.
- Client dependencies: add only the approved minimal MapLibre package surface and required CSS.
- `worker/index.ts`: add the intake API boundary, validation, territory enforcement, idempotency behavior, and D1/private-R2 coordination without changing health semantics.
- `wrangler.jsonc` and Worker environment typing: use the existing local `DB` and `PRIVATE_IMAGES` bindings without provisioning remote resources.
- A new versioned D1 migration: introduce the smallest reversible schema for Pending complaint records and idempotent intake.
- A versioned local geographic fixture: pin CODINDEC `06182` geometry and retrieval/source metadata.
- Existing request-level and browser tests: update obsolete no-intake expectations and cover the smallest set of material validation, durability, privacy, retry, map-confirmation, and failure behaviors through the appropriate real local boundaries.

## Privacy and security boundaries

- Anonymous does not mean public: location, description, WhatsApp, and original photo are private intake data.
- No endpoint or object URL may expose private R2 originals or complaint records publicly.
- User-supplied media is untrusted opaque content. Storage does not establish safe decoding, metadata removal, or safe publication.
- WhatsApp is optional private contact information and must not appear in public UI, logs, URLs, or error details.
- Client-side checks are usability aids only; size, type, location, and field limits require server-side enforcement.
- Turnstile is deliberately absent. Therefore this local slice provides no credible production anti-automation or abuse protection and must not be opened for real-data intake.
- OSM standard tiles are best-effort and policy-bound. They may not be prefetched, bulk-downloaded, used offline, have attribution hidden, or be represented as a production dependency.

## Risks and mitigations

| Risk | Consequence | Proposal boundary or mitigation |
|---|---|---|
| D1 succeeds while R2 fails, or vice versa | Orphaned private data or misleading success | Never report success until both are durable; require idempotent recovery and define exact partial-failure handling during design. |
| Lost server response causes a retry | Duplicate complaints or evidence | Require a stable idempotency identity and convergent retry behavior at the persistence boundary. |
| Boundary precision rejects a valid edge point | Incorrect territory exclusion | Use `covers` semantics and limit any tolerance to documented floating-point robustness. |
| Pinned IGN geometry becomes stale | Local behavior diverges from current official data | Retain source/retrieval metadata and require an upstream re-check before any production use. |
| Original media contains EXIF/GPS or unsafe content | Privacy or security exposure if later served | Keep originals private and opaque; provide no serving/publication path and make no sanitization claim. |
| HEIF support is inferred beyond evidence | Unsupported decoding or false publication assurance | Accept private opaque storage only; decoding and derivatives remain excluded. |
| GPS or map tiles fail | Intake becomes unavailable | Keep manual point selection authoritative and GPS optional; acknowledge OSM has no SLA and local use remains constrained. |
| No production abuse control exists | Automated or harmful real submissions | Restrict this slice to local synthetic intake; defer real Turnstile and production controls explicitly. |
| The change spans UI, API, D1, R2, map data, dependency, and tests | Review quality degrades if the diff is too large | Treat exceeding the canonical 400 changed-line review budget as likely. Under `ask-on-risk`, pause before implementation planning/delivery selection and ask for a chain strategy or explicit `size:exception`; infer neither. |

## Evidence limitations

- The official IGN query identifies the polygon and EPSG:4326 geometry, but exposes no exact dataset update timestamp or data version. ArcGIS service version `10.91` is not polygon freshness evidence.
- Cloudflare documentation names HEIC but not HEIF separately. This proposal relies only on R2's opaque private-object storage capability and does not claim HEIF processing support.
- Cloudflare Images has a documented 10 MB upload limit and therefore cannot directly satisfy every allowed 15 MB original; Images usage is not part of this change.
- Storage in private R2 does not prove EXIF/GPS removal or sanitization.
- OSM standard tiles have no SLA and may block use without notice; local success does not establish production suitability.
- Prior narrow source-check verdicts for the IGN identity and selected Cloudflare claims were missing-evidence or unclear. The research artifact therefore bases those claims on freshly retrieved official source passages and records that limitation.
- Local and synthetic tests can demonstrate behavior through configured local D1/R2/workerd boundaries, but cannot prove deployed resource configuration, production traffic behavior, production abuse resistance, boundary freshness, or operational readiness.

## Rollback

Rollback is local and reversible:

1. Remove or disable the intake UI and API route, restoring the prior landing behavior and preserving the non-official-channel warning.
2. Remove the MapLibre dependency and local map integration.
3. Apply the migration's explicit local reversal to remove the newly introduced complaint schema after retaining or deliberately discarding synthetic test data.
4. Delete only private R2 objects created by this synthetic intake flow, using their intake ownership/idempotency metadata to avoid unrelated objects.
5. Remove the pinned polygon fixture only after the intake path no longer depends on it.
6. Re-run the existing health, SPA fallback, and unknown-API checks to confirm the foundation behavior is restored.

No production data or remote resources are expected because provisioning, deployment, and real-data intake are excluded.

## Success criteria

The proposal is satisfied when a later approved implementation can demonstrate all of the following:

1. An anonymous local user can submit one synthetic complaint only after manually confirming a point covered by the pinned CODINDEC `06182` polygon.
2. A point exactly on the polygon boundary is accepted, while an exterior point is rejected.
3. GPS denial, failure, or unavailability does not block manual point selection and confirmation.
4. Exactly one JPG/JPEG, PNG, WebP, HEIC, or HEIF photo of at most 15 MB is required; missing, oversized, or disallowed files are rejected at the server boundary.
5. HEIC and HEIF originals remain opaque, private R2 objects with no generated derivative, public URL, conversion, or sanitization claim.
6. Description is optional and cannot exceed 500 characters; WhatsApp is optional and remains private.
7. Every accepted complaint is durably stored in D1 as non-public **Pending** data, and success is returned only after its private original is also durable in R2.
8. Retrying the same logical submission after a lost response returns the original outcome without creating duplicate complaint records or evidence objects.
9. Failures and partial writes are reported truthfully as non-success and do not expose private data.
10. The map shows visible OpenStreetMap attribution and standard OSM tiles are used only in the constrained local-development context.
11. The UI continues to state clearly that the application is not an official municipal channel.
12. Existing health-route, SPA fallback, and unknown-API behavior remains intact.
13. The committed polygon fixture records IGN source and retrieval metadata, while documentation does not claim production freshness.
14. No moderation, publication, public counts/maps/lists, Turnstile, production tile provider, image derivatives, provisioning, deployment, paid service, authentication, real-data intake, commit, or push is introduced by this proposal phase.

## Delivery gate

This proposal authorizes no implementation. The anticipated vertical slice is likely to exceed the **400 changed-line** review budget. Because delivery strategy is `ask-on-risk`, subsequent planning must pause at that risk and request a user-owned delivery choice. Chaining remains deferred, and a single oversized change or `size:exception` must not be inferred.
