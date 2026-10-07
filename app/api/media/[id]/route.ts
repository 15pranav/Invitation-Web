import { admin, bucket, db, readContent, json, failure } from "@/lib/server";
export async function GET(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id)) return json({ error: "Not found" }, 404);
    const upload = await db()
      .prepare("SELECT state FROM media_uploads WHERE id = ?")
      .bind(id)
      .first<{ state: string }>();
    if (upload && upload.state !== "complete")
      return json({ error: "Not found" }, 404);
    const { content } = await readContent();
    const url = "/api/media/" + id;
    const published =
      content.deck.cards.some((x) => x.enabled && x.artwork === url) ||
      content.media.some((x) => x.url === url) ||
      content.bhajans.some((x) => x.url === url) ||
      Object.values(content.audio).includes(url) ||
      Object.values(content.audio.scenes).some(
        (s) => s?.enabled && s.url === url,
      );
    if (!published && !(await admin()))
      return json({ error: "Not found" }, 404);
    const object = await bucket().get(id, { range: r.headers });
    if (!object) return json({ error: "Not found" }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Cache-Control",
      published ? "public,max-age=3600" : "private,no-store",
    );
    headers.set("Accept-Ranges", "bytes");
    headers.set("ETag", object.httpEtag);
    let status = 200;
    if (
      r.headers.has("range") &&
      object.range &&
      "offset" in object.range &&
      "length" in object.range
    ) {
      const offset = object.range.offset ?? 0,
        length = object.range.length ?? object.size;
      headers.set(
        "Content-Range",
        `bytes ${offset}-${offset + length - 1}/${object.size}`,
      );
      headers.set("Content-Length", String(length));
      status = 206;
    }
    return new Response(object.body, { headers, status });
  } catch (e) {
    return failure(e);
  }
}
