import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import allowedDomains from "../domains.config.json" with { type: "json" };
import * as address from "./controllers/address.js";

// Local development only — in production the host injects SMARTY_AUTH_ID /
// SMARTY_AUTH_TOKEN straight into the environment and there is no .env file.
try {
  process.loadEnvFile();
} catch {
  // No .env on disk: everything either comes from the real environment or is
  // missing, which the Smarty service reports on the first lookup.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const embedDir = path.join(distDir, "embed");

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Build CSP directives from the allowlist in domains.config.js.
// "'self'" lets the page load its own assets; allowedDomains opens the door
// to any extra origin the components need to talk to.
const baseSrc = ["'self'", ...allowedDomains];

app.use(
  helmet({
    // The bundle is loaded from other origins — without this, browsers block it.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: baseSrc,
        // 'unsafe-inline' is required for the demo's inline <script> banner and
        // for the <style> tags injected by components at runtime.
        scriptSrc: [...baseSrc, "'unsafe-inline'"],
        styleSrc: [...baseSrc, "'unsafe-inline'"],
        // data: is required for inlined SVG/image assets shipped in the JS bundle.
        imgSrc: [...baseSrc, "data:"],
        connectSrc: baseSrc,
        fontSrc: [...baseSrc, "data:"],
      },
    },
  }),
);

// Bundle served like a CDN — permissive headers for cross-origin embedding.
app.use(
  "/embed",
  express.static(embedDir, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
    },
  }),
);

// Address autocomplete, proxied to Smarty. It lives here rather than in the
// component because Smarty's server-side credentials (auth-id + auth-token)
// must never reach the browser — the alternative, a browser "embedded key",
// has to be re-authorized in Smarty's dashboard for every consumer domain the
// embed lands on. Same CORS treatment as /embed: the component calls this
// from whatever third-party page it's embedded in.
app.use("/api/address", (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Lookups are per-keystroke and cheap to repeat — never let a proxy or the
  // browser serve a stale suggestion list for a different query.
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.get("/api/address/search", address.search);
app.get("/api/address/details", address.details);
app.get("/api/address/autocomplete", address.autocomplete);
app.get("/api/address/validate-country", address.validateCountry);

// Demo page (dist/index.html) plus any other static assets.
app.use(express.static(distDir));

app.listen(port, () => {
  console.log(
    `\n  Valvoline at AutoZone Fast Track Sweepstakes — embed server\n  Demo:   http://localhost:${port}/\n  Bundle: http://localhost:${port}/embed/embed.es.js\n`,
  );
});
