import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { defineConfig, type Plugin } from "vite";
import type * as AddressController from "./server/controllers/address.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// `pnpm dev` runs Vite, not the Express app in server/ — so /api/address/*
// would 404 and the Street Address autocomplete would silently render no
// suggestions. Mount the very same controller Express uses as dev middleware so
// both entry points behave alike. The module is pulled through Vite's own TS
// loader, and lazily, so editing it takes effect without restarting the server.
function embedApiDevServer(): Plugin {
  return {
    name: "embed-api-dev",
    apply: "serve",
    configureServer(server) {
      // Same as server/index.ts: local dev reads .env, production injects the
      // Smarty credentials into the environment directly.
      try {
        process.loadEnvFile();
      } catch {
        // No .env on disk — the Smarty service reports it on the first lookup.
      }

      const app = express();
      const address =
        (name: keyof typeof AddressController): express.RequestHandler =>
        (req, res, next) => {
          void server
            .ssrLoadModule("/server/controllers/address.ts")
            .then((mod) => (mod as Record<string, express.RequestHandler>)[name](req, res, next))
            .catch(next);
        };

      app.get("/api/address/search", address("search"));
      app.get("/api/address/details", address("details"));
      app.get("/api/address/autocomplete", address("autocomplete"));
      app.get("/api/address/validate-country", address("validateCountry"));
      server.middlewares.use(app);
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [embedApiDevServer()],
  // Serve public/ in dev. During build (library mode), disable it — the post-build
  // script (scripts/build-demo-html.ts) copies public/ → dist/ so it lives at the
  // root of the served tree, not inside dist/embed/.
  publicDir: command === "serve" ? "public" : false,
  build: {
    target: "es2020",
    outDir: "dist/embed",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    // Vite's library mode disables minification by default. We re-enable it
    // explicitly so the shipped bundle is production-grade (smaller, no
    // readable identifiers exposing internals).
    minify: "esbuild",
    // Inline ALL assets imported from src/ into the JS bundle as base64 data URLs.
    // This keeps the embed self-contained: a single .js file, no extra fetches.
    // Drop component-local images (svg, png, jpg, webp) next to the component file
    // and import them — they will travel inside the bundle.
    assetsInlineLimit: 100_000_000,
    // Two bundles from the same entry:
    //  - embed.es.js   → <script type="module">
    //  - embed.iife.js → classic <script>, for CMSs that don't allow ES modules.
    //    Its exports are exposed as window.DebrainEmbeds.
    lib: {
      entry: resolve(__dirname, "src/embed.ts"),
      formats: ["es", "iife"],
      name: "DebrainEmbeds",
      fileName: (format) => `embed.${format}.js`,
    },
    rollupOptions: {
      output: {
        assetFileNames: "embed.[ext]",
      },
    },
  },
  server: {
    port: 5173,
    open: false,
    // Inside the devcontainer, listen on every interface so the published port reaches Vite
    host: process.env.DEBRAIN_DEVCONTAINER ? true : undefined,
    // Public URLs opened with `share` (Cloudflare quick tunnels)
    allowedHosts: [".trycloudflare.com"],
  },
}));
