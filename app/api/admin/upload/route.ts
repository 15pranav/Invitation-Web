import {
  admin,
  body,
  bucket,
  db,
  json,
  sameOrigin,
  failure,
} from "@/lib/server";
import { PART_SIZE, validateMedia } from "@/lib/media-policy";
import { hasDirectStorage, uploadPolicy } from "@/lib/r2-upload";
export async function GET() {
  if (!(await admin()))
    return json({ error: "Administrator access required." }, 403);
  return json({ limits: uploadPolicy() });
}
export async function POST(r: Request) {
  try {
    const user = await admin();
    if (!user) return json({ error: "Administrator access required." }, 403);
    if (!sameOrigin(r)) return json({ error: "Invalid request origin." }, 403);
    let input, format;
    try {
      input = await body(r);
      if (
        typeof input?.name !== "string" ||
        input.name.length > 200 ||
        typeof input?.type !== "string"
      )
        throw Error("Invalid file details.");
      format = validateMedia(input, uploadPolicy());
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Invalid file details." },
        400,
      );
    }
    const expired = await db()
      .prepare(
        "SELECT id,upload_id FROM media_uploads WHERE state = 'pending' AND expires < ? LIMIT 8",
      )
      .bind(Date.now())
      .all<{ id: string; upload_id: string }>();
    for (const old of expired.results) {
      await bucket().resumeMultipartUpload(old.id, old.upload_id).abort();
      await db()
        .prepare("DELETE FROM media_uploads WHERE id = ?")
        .bind(old.id)
        .run();
    }
    const active = await db()
      .prepare(
        "SELECT count(*) AS n FROM media_uploads WHERE owner = ? AND state = 'pending'",
      )
      .bind(user.email)
      .first<{ n: number }>();
    if ((active?.n || 0) >= 10)
      return json(
        {
          error:
            "Several uploads are still open. Finish or cancel them before starting another.",
        },
        429,
      );
    const id = crypto.randomUUID();
    const upload = await bucket().createMultipartUpload(id, {
      httpMetadata: { contentType: format.type },
      customMetadata: { name: input.name, owner: user.email },
    });
    try {
      await db()
        .prepare(
          "INSERT INTO media_uploads (id,owner,upload_id,name,mime,kind,size,expires) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          user.email,
          upload.uploadId,
          input.name,
          format.type,
          format.kind,
          input.size,
          Date.now() + 3600000,
        )
        .run();
    } catch (e) {
      await upload.abort();
      throw e;
    }
    return json({ id, partSize: PART_SIZE, direct: hasDirectStorage() });
  } catch (e) {
    return failure(e);
  }
}
