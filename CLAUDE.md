# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git branches — never create them

All work stays on the current branch (`main`). **Never create, propose or ask about a new branch**
— not for commits, handoffs or PRs, and not even when a skill or workflow says the work must go on
its own branch (e.g. `probability-embed-form` → `workflows/handoff.md`). This rule overrides them.
When a branch name is needed (e.g. the handoff message), use the current one.

## Commands

| Command           | Purpose                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Vite dev server with HMR on `http://localhost:5173` (foreground — agents use `pnpm dev:*` instead)                                          |
| `pnpm dev:status` | Background dev server: running? URL. Also `dev:start`, `dev:stop`, `dev:restart`, `dev:logs [lines]`                                        |
| `pnpm build`      | `tsc → vite build → tsx scripts/build-demo-html.ts` — full pipeline, see "Build pipeline" below                                             |
| `pnpm serve`      | Run Express server (`tsx server/index.ts`) — requires `pnpm build` first                                                                    |
| `pnpm start`      | `build` + `serve` (the full prod preview from scratch)                                                                                      |
| `pnpm typecheck`  | Runs `tsc --noEmit` against **both** tsconfigs (`tsconfig.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`/`server/`/`scripts/`) |
| `pnpm lint`       | oxlint                                                                                                                                      |
| `pnpm format`     | oxfmt — applies formatting in place                                                                                                         |
| `pnpm share`      | Public `https://*.trycloudflare.com` URL to the dev server (`pnpm share 3000` for the prod preview) — ask before running                    |

There is no test suite. Verify changes end-to-end against the running dev server (`pnpm dev:status` for the URL, `pnpm dev:logs` for errors), or `pnpm build` for the production bundles.

## Project environment — commands run in a container

Users only need **Docker and Claude Code**: Node 26, pnpm, Vite+ and every other tool live in this project's container (`.devcontainer/`, image `ghcr.io/debrain-dev/debrainpacks:26-dev`, same Node 26 / Alpine base as production).

- **How it works:** Claude Code runs on the host. The hooks in `.claude/settings.json` start the container when a session opens (`SessionStart`, in the background) and rewrite every Bash command to `.devcontainer/run '<command>'`, which executes it inside the container in the matching folder. If a command comes before the container is ready, the hook waits for it. File reads and edits work on the host files, which the container sees through the bind mount. Inside the container `DEBRAIN_DEVCONTAINER=1` is set.
- **You manage the environment:** starting it (`.devcontainer/up`) and stopping it (`.devcontainer/down`) is fine without asking — it's an idle container. If it can't start because Docker is missing or stopped, tell the user to install/start OrbStack or Docker Desktop; that's the only prerequisite.
- **Never install tools on the host:** don't install Node, pnpm or vp on the user's machine, and never run `pnpm install` on the host — `node_modules` is installed for Linux inside the container.
- **Host commands:** commands whose first word is `git`, `gh`, `docker`, `open`, `code`, `zed`, `cursor`, `claude`, `brew`, `ssh` or `scp` stay on the host (credentials and apps live there). The first word decides for the whole Bash call, so don't mix host commands and project commands in one call.
- **Never bypass the container on your own:** prefixing a command with `DEBRAIN_HOST=1 ` runs it on the host. Use it only when the user explicitly asks for that.
- **URLs for the user:** the container publishes the dev server (5173) and the Express server (3000) on free host ports — check `.devcontainer/.ports` (`DEV_PORT`, `API_PORT`) and give the user those URLs.
- **Public URL:** `pnpm share [port]` opens a random `https://*.trycloudflare.com` URL (port 5173 by default; `3000` with `pnpm start` to test the real bundles, including `embed.iife.js`, from a client's site). **Never start it without asking** — it publishes the dev server to the internet. Stop it as soon as it's no longer needed.
- **Dev server — you manage it:** it runs in the background inside the container (`debrainpacks-services`) and starts with the session. Check it with `pnpm dev:status` (prints the URL to give the user) and `pnpm dev:logs`; start/stop/restart it yourself with `pnpm dev:start` / `dev:stop` / `dev:restart`, no need to ask. Code changes hot-reload; restart after changing dependencies, `vite.config.ts` or env vars. Never run `pnpm dev` as a Bash command (it blocks or dies with your session). `pnpm serve` / `pnpm start` (production preview, foreground) and `pnpm share` still need the user's OK.
- VS Code users can also "Reopen in Container" (`.devcontainer/devcontainer.json`): it's the same container.

## Big picture

This is a **boilerplate** for shipping embeddable Lit web components. The "product" of `pnpm build` is a self-contained bundle in two formats from the same entry: `embed.es.js` (loaded with `<script type="module">`) and `embed.iife.js` (classic `<script>`, for CMSs that don't allow ES modules; exports on `window.DebrainEmbeds`). A page must load only one of them — both register the same custom elements. The Express server is a **demo CDN** for testing — not the production hosting.

Three patterns are spread across multiple files and easy to break if you don't understand them:

### 1. One HTML, two modes (the `@embed-entry` rewrite)

The root [index.html](index.html) and [example/index.html](example/index.html) are the **single source** for the demo / docs / isolated test page. They contain this marker:

```html
<!-- @embed-entry: this script tag is rewritten by scripts/build-demo-html.ts during build -->
<script type="module" src="/src/embed.ts"></script>
```

- **Dev** (Vite :5173): the file is served as-is, the `/src/embed.ts` import triggers Lit + HMR.
- **Build**: [scripts/build-demo-html.ts](scripts/build-demo-html.ts) reads every HTML in its `pages` array, regex-replaces the marker block with that page's production script tag (`/embed/embed.es.js` as a module, or `/embed/embed.iife.js` for `dist/example/iife/`, generated from `example/index.html`), and writes the result to `dist/`. Express then serves `dist/` statically.

The marker regex is strict — do not change its whitespace or attribute order. Adding a new HTML page (e.g. another isolated test) requires appending its path to the `pages` array in `build-demo-html.ts`.

### 2. Vite outputs into `dist/embed/`, not `dist/`

[vite.config.ts](vite.config.ts) sets `build.outDir: "dist/embed"`. This is intentional so that:

- The bundles land at `dist/embed/embed.es.js` and `dist/embed/embed.iife.js` → Express maps `/embed/*` to that directory. Formats come from `build.lib.formats`; the IIFE global name from `build.lib.name`.
- `dist/index.html`, `dist/example/`, and the contents of `public/` live alongside it at the root of the served tree.
- `emptyOutDir: true` only wipes `dist/embed/`, so the HTML and public assets survive across rebuilds within a single `pnpm build` run.

`publicDir` is **conditional** (`command === "serve" ? "public" : false`): Vite serves `public/` in dev but ignores it during build. The post-build script copies `public/` → `dist/` manually to avoid duplication inside `dist/embed/`.

### 3. Everything inlines into the JS bundle

`assetsInlineLimit: 100_000_000` in [vite.config.ts](vite.config.ts) forces Vite to inline **every** asset import (svg, png, jpg, webp, etc.) as a base64 data URL inside the JS. Combined with `cssCodeSplit: false`, the result is a single `.js` file with no external dependencies — the contract that lets the embed drop into any third-party page.

If you find yourself emitting separate asset files from `src/`, you've broken this guarantee. The convention is: **component-local images go next to the `.ts` file** (e.g. `src/components/counter/icon.svg`) and are imported with `import iconUrl from "./icon.svg"`.

## Light DOM, not shadow DOM

Components **must** override `createRenderRoot()` to return `this`. Styles cannot live in the Lit `static styles` slot (that's shadow-DOM only). The convention is:

1. Put styles in `<name>.scss` next to the component.
2. Import them with `?inline`: `import styles from "./counter.scss?inline"`.
3. Call `injectStyles("<tag-name>", styles)` at module scope — see [src/lib/inject-styles.ts](src/lib/inject-styles.ts). This appends a `<style data-embed-id="<tag-name>">` to `document.head` exactly once per component.
4. **Prefix every CSS class with the custom element name** (BEM-style: `.debrain-counter`, `.debrain-counter__btn`). Since styles live in the host document, unprefixed classes will collide with the consumer's page.

To register a new component in the bundle, add its import to [src/embed.ts](src/embed.ts).

## CSP allowlist

[server/index.ts](server/index.ts) reads [domains.config.json](domains.config.json) (a single JSON array of origins) and merges it into helmet's CSP across `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `font-src`. `'unsafe-inline'` is preserved on script/style (needed for the demo's inline scripts and the runtime `injectStyles` mechanism); `data:` is preserved on img/font (needed for the inlined base64 assets).

When adding origins your components need to talk to in production, edit `domains.config.json` — do **not** disable the CSP block.

## TypeScript / Lit decorator config

[tsconfig.json](tsconfig.json) sets `experimentalDecorators: true` and `useDefineForClassFields: false`. Both are mandatory for Lit's `@customElement` / `@property` decorators. Don't switch these on without verifying the Lit decorators still work.

## Deploy (Docker, Node 26)

Deploy **only with Docker Compose**: [docker-compose.yml](docker-compose.yml) (Coolify "Docker Compose" build pack; domain on the `embeds` service, port 3000; `expose`, no host port) builds the [Dockerfile](Dockerfile). `docker-compose.override.yml` is local only (publishes `127.0.0.1:${PORT:-3000}`). The Dockerfile is built on [debrainpacks](https://github.com/debrain-dev/debrainpacks): the `ghcr.io/debrain-dev/debrainpacks:26-builder` stage runs `pnpm fetch` → copies the repo → `pnpm install --offline` → `pnpm build` → `pnpm prune --prod` + `debrainpacks-prune`; the `:26-runtime` stage copies `node_modules`, `server/`, `domains.config.json` and `dist/`, runs as non-root and starts `node --import tsx server/index.ts`. The healthcheck comes from the base image (`HEALTHCHECK_PATH=/embed/embed.es.js`).

- Node 26 is required (`.nvmrc`, `engines`). Locally, install pnpm 9 globally (Node 25+ doesn't bundle corepack).
- If `server/index.ts` starts reading a new file at runtime, add a `COPY` for it to the runtime stage.
- After updating `pnpm-lock.yaml`, rebuild the image (the lockfile is copied into it).

## Vite version note

Vite 8 removed the `css.preprocessorOptions.scss.api` option (modern-compiler is the only Sass API). Don't reintroduce that key.
