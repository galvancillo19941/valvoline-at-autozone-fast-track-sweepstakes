import heic2any from "heic2any";

export function isHeic(file: File): boolean {
  return (
    file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/i.test(file.name)
  );
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

// Safari/iOS (and Chrome where the OS ships an HEVC decoder) can decode HEIC
// themselves. That path is faster than heic2any, needs none of its
// eval/blob-worker CSP grants, and reads variants libheif rejects with
// "ERR_LIBHEIF format not supported" (newer iPhone/Samsung HDR, etc.), so it
// goes first and heic2any stays as the fallback for browsers that can't.
async function heicToJpegNative(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2d canvas unavailable");
    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob failed"))),
        "image/jpeg",
        0.8,
      ),
    );
  } finally {
    bitmap.close();
  }
}

// heic2any's libheif build is asm.js, booted via new Function() inside a blob
// Worker, so the page's CSP needs 'unsafe-eval' + worker-src blob: (see
// server/index.ts). That only covers our own demo page: on a consumer page
// THAT page's CSP governs and the fallback can fail there.
export async function heicToJpeg(file: File): Promise<File> {
  const jpegName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  const toFile = (blob: Blob): File =>
    new File([blob], jpegName, { type: "image/jpeg", lastModified: Date.now() });

  try {
    return toFile(await heicToJpegNative(file));
  } catch {
    try {
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
      // A HEIC container can hold a burst of images; take the first.
      return toFile(Array.isArray(converted) ? converted[0] : converted);
    } catch (error) {
      // heic2any rejects with a plain { code, message } object, not an Error.
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      // Some camera-roll exports keep the .heic name but hold plain JPEG
      // bytes; there is nothing to convert, pass it straight on.
      if (message.includes("already browser readable")) return toFile(file);
      throw error;
    }
  }
}
