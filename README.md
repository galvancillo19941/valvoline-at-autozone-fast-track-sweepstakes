# Valvoline at AutoZone Fast Track Sweepstakes

Entry form for the **Valvoline at AutoZone Fast Track Sweepstakes**, built as an **embeddable web component** (`<valvoline-at-autozone-fast-track-sweepstakes>`) that drops into any third-party page.

It wraps Probability's Universal Form and adds Smarty address autocomplete, receipt upload (images, PDF, HEIC), the EI captcha and GA4 events.

## Stack

- **Lit 3** (no shadow DOM — light DOM with prefixed styles)
- **SCSS** (modern Sass, via Vite)
- **Vite 8** in library mode → produces `embed.es.js` (ES module) and `embed.iife.js` (classic script)
- **TypeScript 7**
- **Express 5 + Helmet** serving the bundle, the demo page and the Smarty address proxy
- **oxlint / oxfmt** for linting and formatting
- **Node.js 26 + pnpm 9**, provided by the devcontainer (see below)

## Getting started

You only need **Docker** ([OrbStack](https://orbstack.dev) or Docker Desktop, running) and **Claude Code**. Node 26, pnpm and the rest live in the project's container, and Claude Code runs every command there for you.

1. **Open the folder with Claude Code** and accept the "trust this folder" prompt the first time — that enables the hooks in `.claude/settings.json`. Claude starts the container on its own.
2. **Copy `.env.example` to `.env`** and fill in the Smarty credentials (`SMARTY_AUTH_ID`, `SMARTY_AUTH_TOKEN`). Without them the address autocomplete answers 500.
3. The dev server runs at `http://localhost:5173` (or the port in `.devcontainer/.ports`). Manage it with `pnpm dev:status`, `dev:restart`, `dev:stop` and `dev:logs`.

Without Claude: `.devcontainer/up` starts the container, `.devcontainer/run <command>` runs commands in it, `.devcontainer/down` stops it. VS Code's "Reopen in Container" opens the same container.

## One page, two modes

The root `index.html` is the demo page. It's served in two modes:

- **Dev** (`pnpm dev`, Vite on :5173): loads the component from `/src/embed.ts` with HMR.
- **Prod** (`pnpm serve`, Express on :3000): loads the compiled bundle from `/embed/embed.es.js`.

A post-build step (`scripts/build-demo-html.ts`) rewrites the script tag automatically, so you only maintain one source.

## Layout

```
src/
├── embed.ts                  # entry — registers the component
├── lib/                      # shared helpers (styles, scripts, analytics, address, HEIC, …)
└── components/
    └── valvoline-at-autozone-fast-track-sweepstakes/
        ├── valvoline-at-autozone-fast-track-sweepstakes.ts    # LitElement (light DOM)
        ├── valvoline-at-autozone-fast-track-sweepstakes.scss  # styles prefixed with the tag name
        └── *.svg / *.png                                      # component-local assets

server/index.ts               # Express + helmet (serves dist/ and /api/address/*)
server/controllers, services  # Smarty address proxy
scripts/build-demo-html.ts    # rewrites the script tag for production
public/                       # static assets served at the root (favicon)
domains.config.json           # origins allowed in the CSP
index.html                    # demo page
example/index.html            # isolated test page — only the component
```

## Scripts

| Command           | What it does                                               |
| ----------------- | ---------------------------------------------------------- |
| `pnpm dev`        | Vite dev server with HMR on `http://localhost:5173`        |
| `pnpm build`      | Type check + build `dist/` (bundles + demo pages)          |
| `pnpm serve`      | Express on `http://localhost:3000` serving `dist/` + demo  |
| `pnpm start`      | `build` + `serve`                                          |
| `pnpm lint`       | oxlint                                                     |
| `pnpm format`     | oxfmt                                                      |
| `pnpm typecheck`  | tsc --noEmit                                               |
| `pnpm share`      | Public URL to the dev server (`pnpm share 3000`: prod)     |
| `pnpm dev:status` | Background dev server (also `dev:start/stop/restart/logs`) |

## Deploy

Always with **Docker Compose**: [`docker-compose.yml`](docker-compose.yml) builds the [`Dockerfile`](Dockerfile) (Node 26). The server listens on port `3000`, runs as a non-root user and has a built-in healthcheck.

Environment variables on the server: `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN`, **without quotes**.

Try the production build locally (`docker-compose.override.yml` publishes it on `http://localhost:3000`):

```bash
docker compose up --build
```

## Installing the embed

```html
<script src="https://your-host/embed/embed.iife.js"></script>
<valvoline-at-autozone-fast-track-sweepstakes></valvoline-at-autozone-fast-track-sweepstakes>
```

The ES module version also works (`<script type="module" src="https://your-host/embed/embed.es.js">`). Load only one of the two bundles on a page: both register the same custom element. The IIFE bundle exposes its exports as `window.ValvolineEmbeds`.

CSS and assets travel inline inside the JS — no extra `<link>` or files required.

## Security notes

- `helmet` is enabled with `crossOriginResourcePolicy: 'cross-origin'` so the bundle can be loaded from other origins.
- The server enforces a Content Security Policy built from the allowlist in [`domains.config.json`](domains.config.json). Add every origin the component needs to talk to.
- `Access-Control-Allow-Origin: *` headers are applied only to `/embed/*`.
