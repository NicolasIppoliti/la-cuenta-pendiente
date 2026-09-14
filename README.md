# La Cuenta Pendiente

> Los reclamos de la ciudad, en un solo mapa.

A **local, synthetic-only demonstration** of private complaint intake. It is not an
official municipal channel, not production-ready software, and must not be used for
real complaints or personal data.

## Local setup

Use Node 24.20.0 and pnpm 10.32.1. From this repository:

```sh
pnpm install
pnpm dev
```

Open `http://la-cuenta-pendiente-dev.localhost:1355` in Chrome, Firefox, or Edge.
Stop with Ctrl-C; the foreground runner stops its app and its own Portless proxy.

D1 (`DB`) and private R2 (`PRIVATE_IMAGES`) are local emulations managed by the
Cloudflare Vite plugin. Both bindings explicitly disable remote access. The all-zero
D1 ID is a placeholder, not a provisioned database. Local generated state lives in
ignored `.wrangler/`; do not store real personal data.

### Synthetic Pending intake quick path

1. Open the local URL and keep the visible local/synthetic, non-official-channel
   warning in view.
2. Click the map to select a point in the Partido de Coronel de Marina Leonardo
   Rosales, then choose **Confirmar punto**. Browser GPS is optional assistance only;
   it cannot confirm a point or prevent manual selection when unavailable.
3. Attach exactly one synthetic JPG/JPEG, PNG, WebP, HEIC, or HEIF photo no larger
   than 15 MiB. Description is optional (up to 500 Unicode code points); WhatsApp is
   optional private contact data.
4. Submit the form. A success receipt shows only its complaint ID and `Pending`.
   `Pending` means durably received in this local flow; it does not mean reviewed,
   approved, published, sent to the municipality, or officially received.

The form uses one idempotency key for an unchanged retry. A retry after a transient
failure retains the same form data and key; a successful retry returns the original
receipt rather than creating another logical complaint or original-photo key.

### Local persistence and map boundaries

Each `pnpm dev`, `pnpm preview`, and `pnpm test:e2e` run first applies pending local
D1 migrations with `pnpm exec wrangler d1 migrations apply DB --local`. This applies
only local state; do not add a remote flag, provision Cloudflare resources, or deploy.
The reversal SQL in `rollback/0001_pending_complaints.sql` is for deliberate local
synthetic-data cleanup after related private objects are handled.

Accepted records are stored locally with the initial status `Pending`; their
coordinates, description, WhatsApp value, and original photo have no public read
route. Originals are private opaque R2 objects. Accepting JPG/JPEG, PNG, WebP, HEIC,
or HEIF does **not** claim decoding, conversion, sanitization, metadata removal,
derivatives, or publication safety.

The map uses standard OpenStreetMap raster tiles only on `localhost` and `.localhost`
for constrained human-driven local use. It displays `© OpenStreetMap contributors`.
Do not prefetch, bulk-download, use offline tiles, hide attribution, or treat those
tiles as a production basemap authorization. The committed IGN boundary fixture is
pinned local data with source and retrieval metadata, not a freshness guarantee.

## Verification

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium # only when the browser is missing
pnpm test:e2e
```

`pnpm preview` serves the built app through Cloudflare plugin/workerd at
`http://la-cuenta-pendiente-preview.localhost:1356`. Portless 0.15.6 assigns free
application ports. The proxies still need free ports 1355 (dev) and 1356 (preview);
an occupied proxy port fails without taking over the listener.

`pnpm test:e2e` owns a separate proxy on an ephemeral port and a dedicated test route;
Playwright starts/stops its own preview app and never reuses an existing server. Node
API tests use loopback plus the named Host header; Chromium resolves `.localhost`
directly. The E2E harness fulfils its map-tile fixture locally and rejects other OSM
hosts, so its test traffic does not use the standard OSM service.

The runner uses HTTP, loopback only, and ignored project state in `.portless/`. It
disables hosts syncing and discards inherited Portless settings, including tunnels. No
sudo, CA trust, system services, hosts edits, or remote resources are needed. Safari
or system DNS may not resolve these names; use a supported browser instead.

`GET /api/health` returns `{ "status": "ok" }`: process liveness only, not D1/R2
readiness. Other methods return 405 with `Allow: GET`. `/api` and `/api/*` always run
the Worker before assets; unknown API paths return JSON 404, never SPA HTML. Other
navigation paths use Cloudflare static assets' SPA fallback.

## Explicit limitations

This slice does not add moderation, review, approval, rejection, publication, public
complaint maps/lists/details/counts, authentication, identity verification, Turnstile,
rate limiting, image processing, production tile selection, remote Cloudflare
resources, deployment, or operational readiness. It makes no claim about current IGN
boundary freshness, production D1/R2 durability, production OSM availability, or
production abuse protection.

The current production build emits a client-chunk warning above 500 kB. Its client
output is approximately 1.251 MB minified / 347 kB gzip; that is not production
performance evidence.

`pnpm lint` currently exits 1 only for the out-of-scope
`.pi/gentle-ai/sdd-preflight.json` and pinned one-line
`worker/data/ign-06182.json`. Scoped Biome checks across the implementation pass; this
does not mean lint is globally green.

React 19, Vite, TypeScript, Tailwind 4, Biome, pnpm, Cloudflare Workers/static assets,
and MapLibre are installed. No deployment, domain purchase, provisioning, or paid
activation is included. Those require explicit later human decisions; do not run
deployment commands with this placeholder configuration.
