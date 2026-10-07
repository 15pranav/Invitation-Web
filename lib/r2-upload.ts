import { env } from "cloudflare:workers";
import { defaultPolicy, MB, MediaPolicy } from "./media-policy";
export function uploadPolicy(): MediaPolicy {
  const limit = (
    value: string | undefined,
    fallback: number,
    ceiling: number,
  ) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 && n <= ceiling ? n * MB : fallback;
  };
  return {
    audio: limit(env.MEDIA_AUDIO_MAX_MB, defaultPolicy.audio, 100),
    image: limit(env.MEDIA_IMAGE_MAX_MB, defaultPolicy.image, 30),
    video: limit(env.MEDIA_VIDEO_MAX_MB, defaultPolicy.video, 500),
  };
}
// Only a short-lived capability for one server-owned part leaves the Worker.
export function hasDirectStorage() {
  return !!(
    env.R2_UPLOAD_ACCOUNT_ID &&
    env.R2_UPLOAD_BUCKET &&
    env.R2_UPLOAD_ACCESS_KEY_ID &&
    env.R2_UPLOAD_SECRET_ACCESS_KEY
  );
}
export async function signedPartURL(
  key: string,
  uploadId: string,
  part: number,
) {
  if (!hasDirectStorage()) return null;
  const encode = (s: string) =>
    encodeURIComponent(s).replace(
      /[!'()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    );
  const utf = new TextEncoder();
  const hex = (a: ArrayBuffer) =>
    Array.from(new Uint8Array(a), (n) => n.toString(16).padStart(2, "0")).join(
      "",
    );
  const hash = async (s: string) =>
    hex(await crypto.subtle.digest("SHA-256", utf.encode(s)));
  const hmac = async (key: BufferSource, s: string) =>
    crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      ),
      utf.encode(s),
    );
  const time = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = time.slice(0, 8),
    scope = `${day}/auto/s3/aws4_request`;
  const host = `${env.R2_UPLOAD_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${encode(env.R2_UPLOAD_BUCKET!)}/${encode(key)}`;
  const query = Object.entries({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${env.R2_UPLOAD_ACCESS_KEY_ID}/${scope}`,
    "X-Amz-Date": time,
    "X-Amz-Expires": "600",
    "X-Amz-SignedHeaders": "host",
    partNumber: String(part),
    uploadId,
  })
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${encode(k)}=${encode(v)}`)
    .join("&");
  const canonical = `PUT\n${path}\n${query}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
  let k = await hmac(utf.encode("AWS4" + env.R2_UPLOAD_SECRET_ACCESS_KEY), day);
  for (const step of ["auto", "s3", "aws4_request"]) k = await hmac(k, step);
  const signature = hex(
    await hmac(
      k,
      `AWS4-HMAC-SHA256\n${time}\n${scope}\n${await hash(canonical)}`,
    ),
  );
  return `https://${host}${path}?${query}&X-Amz-Signature=${signature}`;
}
