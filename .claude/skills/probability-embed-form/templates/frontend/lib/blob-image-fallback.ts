// The receipt preview and the crop modal load the picked file through a
// `blob:` URL in an <img>. A host page whose CSP has no `blob:` in img-src
// blocks that (the image errors out: the crop modal closes, no preview), and we
// can't change the host's CSP. `data:` is almost always allowed, so when blob
// images are refused we read the very same Blob and hand the <img> a data: URL.
const blobs = new Map<string, Blob>();
let installed = false;
let blobImagesBlocked = false;

// 1x1 transparent GIF, only there to find out whether the host allows blob images.
const PROBE_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (char) => char.charCodeAt(0),
);

export function installBlobImageFallback(): void {
  if (installed) return;
  installed = true;

  // A blob: URL can't be read back once the CSP refuses it (fetch is governed
  // by connect-src), so remember what each one points at.
  const create = URL.createObjectURL;
  URL.createObjectURL = function (obj: Blob | MediaSource): string {
    const url = create.call(URL, obj);
    if (obj instanceof Blob) blobs.set(url, obj);
    return url;
  };

  const revoke = URL.revokeObjectURL;
  URL.revokeObjectURL = function (url: string): void {
    revoke.call(URL, url);
    // The refused <img> reports its error a moment later; let it still find the Blob.
    window.setTimeout(() => blobs.delete(url), 5000);
  };

  const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!srcDescriptor?.set) return;
  const setSrc = srcDescriptor.set;

  const setDataUrl = (img: HTMLImageElement, blobUrl: string): boolean => {
    const blob = blobs.get(blobUrl);
    if (!blob) return false;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setSrc.call(img, reader.result);
    });
    reader.readAsDataURL(blob);
    return true;
  };

  // Detached `new Image()` objects (filepond's preview, the webp conversion)
  // report their failure to an onerror the library set before the src, so it
  // would be too late to repair them afterwards. Find out up front instead.
  const probeUrl = create.call(URL, new Blob([PROBE_GIF], { type: "image/gif" }));
  const probe = new Image();
  probe.addEventListener("error", () => (blobImagesBlocked = true));
  probe.addEventListener("load", () => URL.revokeObjectURL(probeUrl));
  setSrc.call(probe, probeUrl);

  Object.defineProperty(HTMLImageElement.prototype, "src", {
    ...srcDescriptor,
    set(this: HTMLImageElement, value: string) {
      if (typeof value === "string" && value.startsWith("blob:")) {
        if (blobImagesBlocked && setDataUrl(this, value)) return;
        this.addEventListener("error", () => setDataUrl(this, value), { once: true });
      }
      setSrc.call(this, value);
    },
  });

  // The crop modal is written with innerHTML (`<img src="blob:…">`), which never
  // goes through the setter. `error` doesn't bubble, so catch it while
  // capturing, and stop it there: Universal Form closes the modal on that event.
  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.src.startsWith("blob:")) return;
      if (setDataUrl(img, img.src)) event.stopImmediatePropagation();
    },
    true,
  );
}
