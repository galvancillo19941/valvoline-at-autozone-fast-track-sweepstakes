const injected = new Set<string>();

export function injectStyles(id: string, css: string): void {
  if (typeof document === "undefined") return;
  if (injected.has(id)) return;

  injected.add(id);
  const style = document.createElement("style");
  style.dataset.embedId = id;
  style.textContent = css;
  document.head.appendChild(style);
}
