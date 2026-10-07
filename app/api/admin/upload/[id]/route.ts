import {
  admin,
  body,
  boundedBody,
  bucket,
  db,
  failure,
  json,
  sameOrigin,
} from "@/lib/server";
import { PART_SIZE, mediaSignature } from "@/lib/media-policy";
import { signedPartURL } from "@/lib/r2-upload";
type Session = {
  id: string;
  owner: string;
  upload_id: string;
  size: number;
  mime: string;
  kind: string;
  parts: string;
  state: string;
  expires: number;
};
type Context = { params: Promise<{ id: string }> };
async function session(r: Request, ctx: Context) {
  const user = await admin();
  if (!user || !sameOrigin(r))
    return json(
      { error: "Administrator access and a valid origin are required." },
      403,
    );
  const { id } = await ctx.params;
  const row = await db()
    .prepare("SELECT * FROM media_uploads WHERE id = ? AND owner = ?")
    .bind(id, user.email)
    .first<Session>();
  if (!row) return json({ error: "Upload not found." }, 404);
  if (row.expires < Date.now())
    return json(
      { error: "This upload expired. Please select the file again." },
      410,
    );
  return row;
}
async function receipt(s: Session, part: R2UploadedPart) {
  await db()
    .prepare(
      "UPDATE media_uploads SET parts = json_set(parts, ?, json(?)) WHERE id = ? AND state = 'pending'",
    )
    .bind(`$[${part.partNumber - 1}]`, JSON.stringify(part), s.id)
    .run();
}
function validPart(s: Session, n: number) {
  return (
    Number.isInteger(n) &&
    n >= 1 &&
    n <= Math.ceil(s.size / PART_SIZE) &&
    n <= JSON.parse(s.parts).length + 1
  );
}
export async function PUT(r: Request, ctx: Context) {
  try {
    const s = await session(r, ctx);
    if (s instanceof Response) return s;
    if (s.state !== "pending")
      return json({ error: "This upload is already finished." }, 409);
    const n = Number(new URL(r.url).searchParams.get("part"));
    if (!validPart(s, n)) return json({ error: "Invalid upload part." }, 400);
    const expected = Math.min(PART_SIZE, s.size - (n - 1) * PART_SIZE);
    let bytes: Uint8Array;
    try {
      bytes = await boundedBody(r, expected);
    } catch {
      return json({ error: "This upload part exceeds its allowed size." }, 413);
    }
    if (bytes.length !== expected)
      return json(
        { error: "Upload interrupted. Please retry this file." },
        400,
      );
    const part = await bucket()
      .resumeMultipartUpload(s.id, s.upload_id)
      .uploadPart(n, bytes);
    await receipt(s, part);
    return json(part);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request, ctx: Context) {
  try {
    const s = await session(r, ctx);
    if (s instanceof Response) return s;
    let input;
    try {
      input = await body(r);
    } catch {
      return json({ error: "Invalid upload request." }, 400);
    }
    if (input.action === "complete" && s.state === "complete")
      return json({ url: `/api/media/${s.id}`, type: s.kind });
    if (s.state !== "pending")
      return json({ error: "This upload is no longer open." }, 409);
    if (input.action === "sign" || input.action === "receipt") {
      const n = input.partNumber;
      if (!validPart(s, n)) return json({ error: "Invalid part." }, 400);
      if (input.action === "sign")
        return json({ url: await signedPartURL(s.id, s.upload_id, n) });
      if (
        typeof input.etag !== "string" ||
        !/^[a-fA-F0-9]{32}(?:-\d+)?$/.test(input.etag)
      )
        return json({ error: "Invalid storage receipt." }, 400);
      await receipt(s, { partNumber: n, etag: input.etag });
      return json({ ok: true });
    }
    if (input.action !== "complete")
      return json({ error: "Invalid action." }, 400);
    const parts: R2UploadedPart[] = JSON.parse(s.parts);
    if (
      parts.length !== Math.ceil(s.size / PART_SIZE) ||
      parts.some((p, i) => !p || p.partNumber !== i + 1)
    )
      return json(
        { error: "Some parts are missing. Please retry the upload." },
        409,
      );
    // A lost completion response is safely retried against the committed object.
    let object = await bucket().head(s.id);
    if (!object)
      object = await bucket()
        .resumeMultipartUpload(s.id, s.upload_id)
        .complete(parts);
    const sample = await bucket().get(s.id, {
      range: { offset: 0, length: 32 },
    });
    if (
      object.size !== s.size ||
      !sample ||
      !mediaSignature(new Uint8Array(await sample.arrayBuffer()), s.mime)
    ) {
      await bucket().delete(s.id);
      await db()
        .prepare("UPDATE media_uploads SET state = 'rejected' WHERE id = ?")
        .bind(s.id)
        .run();
      return json(
        {
          error:
            "This file’s content or size does not match its format. Choose the original media file.",
        },
        400,
      );
    }
    await db()
      .prepare("UPDATE media_uploads SET state = 'complete' WHERE id = ?")
      .bind(s.id)
      .run();
    return json({ url: `/api/media/${s.id}`, type: s.kind });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(r: Request, ctx: Context) {
  try {
    const s = await session(r, ctx);
    if (s instanceof Response) return s;
    if (s.state === "pending") {
      await bucket().resumeMultipartUpload(s.id, s.upload_id).abort();
      await db()
        .prepare("DELETE FROM media_uploads WHERE id = ? AND state = 'pending'")
        .bind(s.id)
        .run();
    }
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
