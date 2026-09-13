# La Cuenta Pendiente

> Los reclamos de la ciudad, en un solo mapa.

Development-only local foundation, **not the PRD MVP or production-ready software**.
The landing has no complaint submission, counters, map, authentication, or real data.

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
D1 ID is a placeholder, not a provisioned database. No R2 objects are publicly served.
Local generated state lives in ignored `.wrangler/`; do not store real personal data.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium # only when the browser is missing
pnpm test:e2e
pnpm audit --prod
```

`pnpm preview` serves the built app through Cloudflare plugin/workerd at
`http://la-cuenta-pendiente-preview.localhost:1356`. Portless 0.15.6 assigns free
application ports. The proxies still need free ports 1355 (dev) and 1356 (preview);
an occupied proxy port fails without taking over the listener.

`pnpm test:e2e` owns a separate proxy on an ephemeral port and a dedicated test route;
Playwright starts/stops its own preview app and never reuses an existing server.
Dev and preview can stay running. Node API tests use loopback plus the named Host
header; Chromium resolves `.localhost` directly. Tests retain 320px layout, branding,
SPA fallback, health, method rejection, and API JSON 404s including navigations.

The runner uses HTTP, loopback only, and ignored project state in `.portless/`.
It disables hosts syncing and discards inherited Portless settings, including tunnels.
No sudo, CA trust, system services, hosts edits, mocks, or remote resources are needed.
Safari/system DNS may not resolve these names; use a supported browser instead.

`GET /api/health` returns `{ "status": "ok" }`: process liveness only, not D1/R2
readiness. Other methods return 405 with `Allow: GET`. `/api` and `/api/*` always
run the Worker before assets; unknown API paths return JSON 404, never SPA HTML.
Other navigation paths use Cloudflare static assets' SPA fallback.

## Stack and boundaries

React 19, Vite, TypeScript, Tailwind 4, the npm `cn` package, Biome, pnpm, and
Cloudflare Workers/static assets are installed. Static classes need no `cn()` call;
use that package directly when conditional classes are needed, not a custom helper.
The small semantic color palette lives in `src/styles.css`; other scales use Tailwind.
There is no component library, motion, external font, or pretend business functionality.

D1 and private R2 are configured locally only, without schemas or storage workflows.
Cloudflare Images, Turnstile, and Access are approved directions but **not integrated**.
Real iPhone/Android image tests, HEIC conversion and metadata-removal proof remain pending.
Authentication, authorization, privacy controls, moderation, and the complaint MVP
remain future work. Automated checks do not replace manual screen-reader testing.

No deployment, domain purchase, provisioning, or paid activation is included.
Those require explicit later human decisions; free pricing is not guaranteed.
Do not run deployment commands with this placeholder configuration.
