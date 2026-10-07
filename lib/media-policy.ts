export const MB = 1024 * 1024;
export const PART_SIZE = 5 * MB;
export type MediaKind = "audio" | "image" | "video";
export type MediaPolicy = Record<MediaKind, number>;
export const defaultPolicy: MediaPolicy = {
  audio: 25 * MB,
  image: 15 * MB,
  video: 100 * MB,
};
const formats: Record<
  string,
  { type: string; kind: MediaKind; aliases: string[] }
> = {
  mp3: {
    type: "audio/mpeg",
    kind: "audio",
    aliases: ["audio/mp3", "audio/x-mpeg"],
  },
  m4a: { type: "audio/mp4", kind: "audio", aliases: ["audio/x-m4a"] },
  wav: {
    type: "audio/wav",
    kind: "audio",
    aliases: ["audio/x-wav", "audio/wave"],
  },
  ogg: { type: "audio/ogg", kind: "audio", aliases: ["application/ogg"] },
  jpg: { type: "image/jpeg", kind: "image", aliases: [] },
  jpeg: { type: "image/jpeg", kind: "image", aliases: [] },
  png: { type: "image/png", kind: "image", aliases: [] },
  webp: { type: "image/webp", kind: "image", aliases: [] },
  mp4: { type: "video/mp4", kind: "video", aliases: [] },
  webm: { type: "video/webm", kind: "video", aliases: [] },
};
export function validateMedia(
  file: { name: string; type: string; size: number },
  policy = defaultPolicy,
  expected?: MediaKind,
) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const format = formats[ext];
  const mime = file.type.toLowerCase().split(";")[0];
  if (
    !format ||
    (expected && expected !== format.kind) ||
    (mime &&
      mime !== "application/octet-stream" &&
      mime !== format.type &&
      !format.aliases.includes(mime))
  )
    throw new Error(
      expected === "audio"
        ? "Choose an MP3, M4A, WAV or OGG audio file."
        : "Choose a JPEG, PNG, WebP, MP3, M4A, WAV, OGG, MP4 or WebM file with its original extension.",
    );
  if (!Number.isSafeInteger(file.size) || file.size <= 0)
    throw new Error("This file is empty or invalid.");
  if (file.size > policy[format.kind])
    throw new Error(
      `This ${format.kind} file exceeds the ${policy[format.kind] / MB} MB limit.`,
    );
  return { type: format.type, kind: format.kind };
}
// Check container signatures, independently of the supplied MIME/extension.
export function mediaSignature(bytes: Uint8Array, type: string) {
  const text = (offset: number, length: number) =>
    new TextDecoder().decode(bytes.slice(offset, offset + length));
  if (type === "audio/mpeg")
    return (
      text(0, 3) === "ID3" ||
      (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 6) !== 0)
    );
  if (type === "audio/mp4" || type === "video/mp4")
    return text(4, 4) === "ftyp";
  if (type === "audio/wav")
    return text(0, 4) === "RIFF" && text(8, 4) === "WAVE";
  if (type === "audio/ogg") return text(0, 4) === "OggS";
  if (type === "image/webp")
    return text(0, 4) === "RIFF" && text(8, 4) === "WEBP";
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png")
    return bytes.slice(0, 8).join() === "137,80,78,71,13,10,26,10";
  if (type === "video/webm")
    return bytes.slice(0, 4).join() === "26,69,223,163";
  return false;
}
