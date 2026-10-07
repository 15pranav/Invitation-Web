import {
  admin,
  readContent,
  ensureContent,
  db,
  json,
  sameOrigin,
  body,
  failure,
} from "@/lib/server";
import { contentSchema } from "@/lib/content";
export async function GET() {
  try {
    if (!(await admin()))
      return json({ error: "Administrator access required." }, 403);
    await ensureContent();
    return json(await readContent(true));
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(r: Request) {
  try {
    if (!(await admin()))
      return json({ error: "Administrator access required." }, 403);
    if (!sameOrigin(r)) return json({ error: "Invalid request origin." }, 403);
    let data;
    try {
      data = await body(r);
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    const parsed = contentSchema.safeParse(data.content);
    if (!parsed.success)
      return json(
        {
          error: parsed.error.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; "),
        },
        400,
      );
    if (!Number.isInteger(data.revision))
      return json({ error: "Revision required." }, 400);
    const now = new Date().toISOString();
    const publish = data.publish === true;
    const sql = publish
      ? "UPDATE event_content SET draft=?,published=?,revision=revision+1,updated_at=?,published_at=? WHERE id=? AND revision=?"
      : "UPDATE event_content SET draft=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?";
    const values = publish
      ? [
          JSON.stringify(parsed.data),
          JSON.stringify(parsed.data),
          now,
          now,
          "main",
          data.revision,
        ]
      : [JSON.stringify(parsed.data), now, "main", data.revision];
    const result = await db()
      .prepare(sql)
      .bind(...values)
      .run();
    if (!result.meta.changes)
      return json(
        {
          error:
            "Another editor saved changes. Reload before saving so their work is preserved.",
        },
        409,
      );
    return json({
      revision: data.revision + 1,
      publishedAt: publish ? now : null,
    });
  } catch (e) {
    return failure(e);
  }
}
