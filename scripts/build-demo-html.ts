import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const devScriptRegex =
  /<!--\s*@embed-entry:[^>]*-->\s*<script\s+type="module"\s+src="\/src\/embed\.ts"\s*><\/script>/;
const esScript = '<script type="module" src="/embed/embed.es.js"></script>';
// Classic script, as a CMS that doesn't allow ES modules would embed it
const iifeScript = '<script src="/embed/embed.iife.js" defer></script>';

// Every HTML file with an @embed-entry marker, and the bundle each output uses.
// Add new pages here.
const pages = [
  { source: "index.html", output: "index.html", script: esScript },
  { source: "example/index.html", output: "example/index.html", script: esScript },
  // Same isolated page, loading the IIFE bundle (production only: dev has no IIFE build)
  { source: "example/index.html", output: "example/iife/index.html", script: iifeScript },
];

for (const page of pages) {
  const destination = path.join(root, "dist", page.output);

  const html = readFileSync(path.join(root, page.source), "utf8");

  if (!devScriptRegex.test(html)) {
    console.error(
      `ERROR: @embed-entry marker not found in ${page.source}. Cannot rewrite for production.`,
    );
    process.exit(1);
  }

  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, html.replace(devScriptRegex, page.script));
  console.log(`✓ wrote ${path.relative(root, destination)}`);
}

// Vite library mode doesn't copy public/ — mirror it into dist/ ourselves.
const publicDir = path.join(root, "public");
if (existsSync(publicDir)) {
  cpSync(publicDir, path.join(root, "dist"), { recursive: true });
  console.log("✓ copied public/ → dist/");
}
