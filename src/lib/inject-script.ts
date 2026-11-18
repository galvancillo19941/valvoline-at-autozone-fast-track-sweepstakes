const injectedScripts = new Set<string>();
const injectedStylesheets = new Set<string>();

export function injectScript(
  src: string,
  onload?: () => void,
  type?: "module",
  onerror?: () => void,
): void {
  if (typeof document === "undefined") return;
  if (injectedScripts.has(src)) {
    onload?.();
    return;
  }

  injectedScripts.add(src);
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  if (type) script.type = type;
  if (onload) script.addEventListener("load", onload);
  if (onerror) script.addEventListener("error", onerror);
  document.head.appendChild(script);
}

export function injectStylesheet(href: string): void {
  if (typeof document === "undefined") return;
  if (injectedStylesheets.has(href)) return;

  injectedStylesheets.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const injectedPreconnects = new Set<string>();

export function injectPreconnect(href: string, crossOrigin = false): void {
  if (typeof document === "undefined") return;
  if (injectedPreconnects.has(href)) return;

  injectedPreconnects.add(href);
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = href;
  if (crossOrigin) link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}
