# Exploration: add-pending-complaint-intake

## Scope anchor

This change is the bounded intake slice from the validated product mapping recorded in session summary 7615: accept a complaint and leave it **pending**. That mapping remains authoritative for field-level product decisions and exclusions; this exploration does not reopen or extend them.

Explicitly outside this slice: public map/listing or counters, publication, moderation/admin workflow, authentication/authorization, municipal submission, deployment/provisioning, paid services, and unrelated foundation cleanup. The existing warning that the site is not an official municipal channel must not be weakened accidentally.

## Existing seams

- `src/App.tsx` is a single static Spanish landing with no router, form state, or component boundary. It is the only current UI seam; intake UI will replace or extend explicit “no complaints accepted” copy.
- `src/main.tsx` only mounts `App`; there is no client data/API layer.
- `worker/index.ts` is the complete API boundary. It handles only exact `GET /api/health`, rejects other health methods, and JSON-404s everything else. Intake routing, validation, and binding access have no existing abstraction to reuse.
- `wrangler.jsonc` declares local-only `DB` (D1) and private `PRIVATE_IMAGES` (R2), but the D1 ID is a placeholder and there are no migrations, schema, generated binding types, or persistence flow.
- `tests/worker.test.ts` directly exercises the Worker fetch handler; `e2e/smoke.spec.ts` exercises real workerd/API and responsive browser boundaries. Existing tests assert the current no-intake landing copy, so those assertions are intentionally affected by this change.
- `src/styles.css` contains only two semantic colors; there is no form/component system to preserve or expand speculatively.

## Constraints and smallest viable shape

- Preserve the current React → Worker `/api/*` → local Cloudflare binding boundary; no new service or client state library is evidenced.
- Keep submitted records non-public and pending. Private evidence must not acquire a public serving path merely because R2 is bound.
- D1 persistence requires a first schema/migration and typed Worker environment access. This is unavoidable infrastructure for durable intake, not a reason to create a repository/data-layer framework.
- Reuse platform/browser validation only where it matches the authoritative product rules; server-side validation remains required at the trust boundary.
- Keep API errors JSON and preserve health-route behavior and unknown-API 404 behavior.

## Genuine unknowns / required evidence

1. The full text of Engram session summary 7615 was not retrievable through this executor's available memory tools. Before proposal/spec, retrieve it and copy the exact approved fields, validation limits, location representation, image rules, success copy, and privacy/retention decisions; do not infer them from the change name.
2. Confirm whether this first slice includes image upload. If yes, implementation is blocked on evidence for accepted formats/limits plus the already-documented pending HEIC conversion and metadata-removal proof; storage alone is insufficient privacy validation.
3. Confirm the intended anonymous abuse-control boundary. Turnstile is only an approved future direction and adding it would be a dependency/integration decision, not an implicit part of intake.
4. A D1 migration/schema is unavoidable if persistence is in scope and requires explicit migration authorization. Any new package, Cloudflare product activation, remote resource, or external service separately requires approval. No current evidence requires one.
5. CodeGraph could not be initialized or queried because this runtime exposed no command tool; `.codegraph/` is absent. The seam map therefore uses targeted repository reads and should be rechecked with CodeGraph before implementation if available.

## Review-budget risk

A real vertical slice spanning accessible form UX, Worker endpoint/validation, first D1 migration, optional private-image handling, and boundary tests is likely to exceed the canonical **400 changed-line** budget. Under `ask-on-risk`, pause for a delivery decision once exact product rules establish the forecast; do not invent a chain strategy or assume `size:exception`.

## Exploration outcome

The repository has suitable platform seams but no complaint-domain implementation to reuse. The next SDD phase is safe only after summary 7615 is retrieved and the image/abuse-control/migration questions above are resolved or explicitly bounded. No implementation, dependency installation, tests, build, deployment, or provisioning was performed.
