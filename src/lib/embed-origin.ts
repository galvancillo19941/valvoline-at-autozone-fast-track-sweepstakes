// Origin of our own Express app (the one serving this bundle and /api/address/*).
//
// Resolution order:
//
//   1. VITE_API_ORIGIN, baked in at build time. Written to .env.production by the
//      skill's "go to production" step, so the production bundle always calls the
//      production server, even when it cannot tell where it was loaded from.
//      `pnpm dev` doesn't read .env.production, so local work is unaffected.
//   2. The URL the bundle itself was loaded from (script src / import.meta.url):
//        - localhost dev / `pnpm start`  → http://localhost:5173 | :3000
//        - a test server                 → that server
//        - a third-party consumer page   → whichever of ours it loaded the <script> from
//   3. The page's own origin — only when 1 and 2 are both unavailable (an inlined
//      build, a blob: script). On a consumer page this would be THEIR origin and
//      every /api/* call would 404, which is why step 1 exists for production.
//
// Computed once at module scope: `document.currentScript` is only non-null while
// a classic script is executing, so it cannot be read lazily from a getter.
// Rollup rewrites `import.meta.url` for the iife build, so both outputs work.

const configuredOrigin = ((import.meta.env.VITE_API_ORIGIN as string | undefined) ?? "")
  .trim()
  .replace(/\/+$/, "");

const bundleUrl: string = (() => {
  try {
    if (typeof document !== "undefined") {
      const current = document.currentScript as HTMLScriptElement | null;
      if (current?.src) return current.src;
    }
    return import.meta.url;
  } catch {
    return "";
  }
})();

/** Absolute origin of our Express app, with no trailing slash. */
export function embedOrigin(): string {
  if (configuredOrigin) return configuredOrigin;
  const fallback = typeof location !== "undefined" ? location.origin : "";
  if (!bundleUrl) return fallback;
  try {
    const url = new URL(bundleUrl, fallback || undefined);
    // A blob:/data: script URL has no useful origin to hang an API path off.
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : fallback;
  } catch {
    return fallback;
  }
}
