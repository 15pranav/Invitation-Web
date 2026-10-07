// Resize photographs before uploading, so a phone never needs to load a camera original.
export async function prepareMedia(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return file;
  const image = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Unable to prepare this image. Try a smaller photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Unable to prepare this image.")),
        "image/webp",
        0.84,
      ),
    );
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: blob.type,
    });
  } finally {
    image.close();
  }
}

import { readJSON } from "./http-client";
import { MediaKind, MediaPolicy, validateMedia } from "./media-policy";
class TransferError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}
function putPart(
  url: string,
  blob: Blob,
  signal: AbortSignal,
  progress: (bytes: number) => void,
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("PUT", url);
    xhr.timeout = 120000;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => progress(e.loaded);
    xhr.onerror = () => {
      cleanup();
      reject(
        new TransferError(
          "Connection interrupted. Check your connection and try again.",
          true,
        ),
      );
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new TransferError("Upload timed out. Please try again.", true));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status < 200 || xhr.status >= 300) {
        let error = "";
        try {
          error = JSON.parse(xhr.responseText).error || "";
        } catch {}
        reject(
          new TransferError(
            error ||
              (xhr.status === 413
                ? "The storage service rejected this upload part. Please try a smaller file."
                : `Upload failed (${xhr.status}). Please try again.`),
            xhr.status >= 500 || xhr.status === 429,
          ),
        );
        return;
      }
      let etag = xhr.getResponseHeader("ETag")?.replaceAll('"', "") || "";
      if (!etag) {
        try {
          etag = JSON.parse(xhr.responseText).etag;
        } catch {}
      }
      if (!etag) {
        reject(
          new TransferError(
            "Storage did not return an upload receipt. Please check its CORS configuration.",
            false,
          ),
        );
        return;
      }
      resolve({ etag });
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      cleanup();
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }
    xhr.send(blob);
  });
}
export async function uploadMedia(
  file: File,
  policy: MediaPolicy,
  progress: (percent: number) => void,
  signal: AbortSignal,
  expected?: MediaKind,
) {
  validateMedia(file, policy, expected);
  const prepared = await prepareMedia(file);
  const info = validateMedia(prepared, policy, expected);
  const post = async <T>(url: string, data: unknown) =>
    readJSON<T>(
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal,
      }),
    );
  const session = await post<{ id: string; partSize: number; direct: boolean }>(
    "/api/admin/upload",
    { name: prepared.name, size: prepared.size, type: info.type },
  );
  const endpoint = `/api/admin/upload/${session.id}`;
  let complete = false;
  try {
    for (
      let offset = 0, n = 1;
      offset < prepared.size;
      offset += session.partSize, n++
    ) {
      const part = prepared.slice(offset, offset + session.partSize);
      for (let attempt = 0; ; attempt++) {
        try {
          const signed = session.direct
            ? await post<{ url: string }>(endpoint, {
                action: "sign",
                partNumber: n,
              })
            : null;
          const result = await putPart(
            signed?.url || `${endpoint}?part=${n}`,
            part,
            signal,
            (bytes) =>
              progress(
                Math.min(
                  99,
                  Math.floor(((offset + bytes) / prepared.size) * 100),
                ),
              ),
          );
          if (session.direct)
            await post(endpoint, {
              action: "receipt",
              partNumber: n,
              etag: result.etag,
            });
          break;
        } catch (e) {
          if (
            signal.aborted ||
            attempt >= 2 ||
            (e instanceof TransferError && !e.retryable)
          )
            throw e;
          await new Promise((resolve) =>
            setTimeout(resolve, 600 * 2 ** attempt),
          );
        }
      }
    }
    // Idempotent completion handles a lost response without uploading again.
    let result: { url: string; type: MediaKind } | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await post(endpoint, { action: "complete" });
        break;
      } catch (e) {
        if (signal.aborted || attempt === 2) throw e;
      }
    }
    complete = true;
    progress(100);
    return result!;
  } finally {
    if (!complete)
      void fetch(endpoint, { method: "DELETE", keepalive: true }).catch(
        () => {},
      );
  }
}
