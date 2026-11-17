# debrain-ai-embeds-template

Boilerplate for building **embeddable web components** that drop into any third-party site (chat widgets, banners, counters, etc.).

## Stack

- **Lit 3** (no shadow DOM — light DOM with prefixed styles)
- **SCSS** (modern Sass, via Vite)
- **Vite 8** in library mode → produces `embed.es.js` (ES module) and `embed.iife.js` (classic script)
- **TypeScript 7**
- **Express 5 + Helmet** serving the bundle + demo page
- **oxlint / oxfmt** for linting and formatting
- **Node.js 26 + pnpm 9**, provided by the devcontainer (see below)

## Getting started

You only need **Docker** ([OrbStack](https://orbstack.dev) or Docker Desktop, running) and **Claude Code**. Node 26, pnpm and the rest live in the project's container, and Claude Code runs every command there for you.

1. **Open the folder with Claude Code** and accept the "trust this folder" prompt the first time — that enables the hooks in `.claude/settings.json`. Claude starts the container on its own (the first time it downloads the image, ~1 GB, and installs the dependencies).
2. **Ask for what you need.** The dev server is already running — Claude starts it with the session and restarts it when needed — at `http://localhost:5173` (or the port in `.devcontainer/.ports` if it was taken; Claude tells you). Manage it yourself with `pnpm dev:status`, `dev:restart`, `dev:stop` and `dev:logs`.
3. **Public URL** (test on a phone or on a client's site): ask Claude for `pnpm share` (dev server) or `pnpm start` + `pnpm share 3000` (production preview with both bundles). It prints a random `https://….trycloudflare.com` address; anyone with the link can open it, so stop it when you're done.

Without Claude: `.devcontainer/up` starts the container, `.devcontainer/run <command>` runs commands in it, `.devcontainer/down` stops it. VS Code's "Reopen in Container" opens the same container.

## One page, two modes

The root `index.html` is the **single** demo + documentation page. It's served in two modes:

- **Dev** (`pnpm dev`, Vite on :5173): loads the component from `/src/embed.ts` with HMR.
- **Prod** (`pnpm serve`, Express on :3000): loads the compiled bundle from `/embed/embed.es.js`.

A post-build step (`scripts/build-demo-html.ts`) rewrites the script tag automatically when switching from dev to prod, so you only ever maintain one source.

## Layout

```
src/
├── embed.ts                  # entry — registers all components
├── lib/inject-styles.ts      # injects CSS strings into <head> exactly once
├── styles/_tokens.scss       # shared design tokens
└── components/
    └── counter/
        ├── counter.ts        # LitElement (light DOM)
        ├── counter.scss      # styles prefixed with .debrain-counter__*
        └── icon.svg          # component-local asset

server/index.ts               # Express + helmet (serves dist/)
scripts/build-demo-html.ts    # rewrites the script tag for production
public/                       # static assets served at the root (favicon, logo, etc.)
domains.config.json           # origins allowed in the CSP (see "Security notes")
index.html                    # demo + docs (single source of truth)
example/index.html            # isolated test page — only the component, no chrome
```

## Scripts

| Command           | What it does                                               |
| ----------------- | ---------------------------------------------------------- |
| `pnpm dev`        | Vite dev server with HMR on `http://localhost:5173`        |
| `pnpm build`      | Type check + build `dist/` (ES module with CSS inlined)    |
| `pnpm serve`      | Express on `http://localhost:3000` serving `dist/` + demo  |
| `pnpm start`      | `build` + `serve`                                          |
| `pnpm lint`       | oxlint                                                     |
| `pnpm format`     | oxfmt                                                      |
| `pnpm typecheck`  | tsc --noEmit                                               |
| `pnpm share`      | Public URL to the dev server (`pnpm share 3000`: prod)     |
| `pnpm dev:status` | Background dev server (also `dev:start/stop/restart/logs`) |

## Deploy

Always with **Docker Compose**: [`docker-compose.yml`](docker-compose.yml) builds the [`Dockerfile`](Dockerfile) (Node 26, on the [debrainpacks](https://github.com/debrain-dev/debrainpacks) base images). The server listens on port `3000`, runs as a non-root user and has a built-in healthcheck. There's no persistent data: the bundles and demo pages are built into the image.

Try the production build locally (`docker-compose.override.yml` publishes it on `http://localhost:3000`; `PORT=3002` for another port):

```bash
docker compose up --build
```

In Coolify: create the application from the repository with the **Docker Compose** build pack, then set the domain on the `embeds` service with port `3000`. No environment variables are required.

## How to embed elsewhere

```html
<script type="module" src="https://your-cdn.com/embed/embed.es.js"></script>
<debrain-counter count="0"></debrain-counter>
```

If the CMS doesn't allow ES modules (`type="module"`), use the IIFE bundle with a classic script tag. It registers the same elements and exposes the exports as `window.DebrainEmbeds`:

```html
<script src="https://your-cdn.com/embed/embed.iife.js" defer></script>
<debrain-counter count="0"></debrain-counter>
```

Load only one of the two bundles on a page: both register the same custom elements, and a second registration throws. Test the IIFE bundle at `/example/iife/` after `pnpm build` (dev mode only serves the ES version).

CSS travels inline inside the JS — no extra `<link>` required.

## Adding a new component

1. Create `src/components/<name>/<name>.ts` and `<name>.scss`.
2. In the `.ts`, override `createRenderRoot()` returning `this` to render in light DOM.
3. Import the SCSS with `?inline` and call `injectStyles('<tag>', styles)` at module scope.
4. **Prefix ALL CSS classes** with the custom element name (e.g. `.debrain-foo`, `.debrain-foo__btn`) — without shadow DOM, styles live in the host document.
5. Add the import in `src/embed.ts`.

### Images and assets

Place them **next to the component file** inside `src/components/<name>/` (e.g. `icon.svg`, `hero.png`, `pattern.webp`). Import them directly:

```ts
import iconUrl from "./icon.svg";

render() {
  return html`<img src=${iconUrl} alt="" />`;
}
```

Vite converts them into **base64 data URLs inlined inside the JS bundle** (`assetsInlineLimit: 100MB` in `vite.config.ts`). The embed stays a single self-contained `.js` file — no extra fetches, no URLs that break when the consumer mounts it on their site.

For SVGs where you need to drive the color from CSS (`currentColor`), inline the SVG markup into the template with `?raw`:

```ts
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import iconSvg from "./icon.svg?raw";

render() {
  return html`<span class="my-icon">${unsafeHTML(iconSvg)}</span>`;
}
```

See `src/components/counter/icon.svg` and how it's used in `counter.ts` for reference.

## Security notes

- `helmet` is enabled with `crossOriginResourcePolicy: 'cross-origin'` so the bundle can be loaded from other origins.
- The demo server enforces a Content Security Policy built from the allowlist in [`domains.config.json`](domains.config.json). Add every origin your components need to talk to (CDN, APIs, image hosts, analytics).
- `Access-Control-Allow-Origin: *` headers are applied only to `/embed/*`.

### Configuring allowed domains

[`domains.config.json`](domains.config.json) is a single JSON array of origins. Edit it to add production domains:

```json
["http://localhost:*", "https://api.example.com", "https://cdn.example.com"]
```

The server merges this list into the CSP `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, and `font-src` directives, alongside `'self'`. `'unsafe-inline'` is kept in `script-src`/`style-src` so the demo's inline tags and the component-injected styles work; `data:` is kept in `img-src`/`font-src` so the base64-inlined assets from the bundle render.
