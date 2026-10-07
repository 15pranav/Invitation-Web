import { z } from "zod";
import { db, readContent, json, sameOrigin, body, failure } from "@/lib/server";
const schema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  attendance: z.enum(["yes", "no", "maybe"]),
  guests: z.number().int().min(1).max(30),
  website: z.string().max(0).optional(),
});
export async function POST(r: Request) {
  try {
    if (!sameOrigin(r)) return json({ error: "Invalid request origin." }, 403);
    let data;
    try {
      data = schema.safeParse(await body(r));
    } catch {
      return json({ error: "Please check your response." }, 400);
    }
    if (!data.success)
      return json(
        {
          error: "Please enter your name, attendance and a valid guest count.",
        },
        400,
      );
    const { content } = await readContent();
    if (!content.features.rsvp || !content.rsvp.enabled)
      return json({ error: "RSVP is currently closed." }, 403);
    if (data.data.guests > content.rsvp.maxGuests)
      return json({ error: "Please reduce the guest count." }, 400);
    const existing = await db()
      .prepare("SELECT id FROM rsvps WHERE id=?")
      .bind(data.data.id)
      .first();
    if (existing) return json({ ok: true });
    const ip = r.headers.get("cf-connecting-ip") || "local";
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(ip + new Date().toISOString().slice(0, 10)),
        ),
      ),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const now = Math.floor(Date.now() / 1000),
      key = hash + ":" + Math.floor(now / 3600);
    const limit = await db()
      .prepare(
        "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
      )
      .bind(key, now + 3600)
      .first<{ count: number }>();
    if ((limit?.count || 0) > 12)
      return json(
        { error: "Too many responses. Please try again later." },
        429,
      );
    await db().batch([
      db()
        .prepare(
          "INSERT OR IGNORE INTO rsvps (id,name,attendance,guests,created_at) VALUES (?,?,?,?,?)",
        )
        .bind(
          data.data.id,
          data.data.name,
          data.data.attendance,
          data.data.attendance === "no" ? 0 : data.data.guests,
          new Date().toISOString(),
        ),
      db().prepare("DELETE FROM rate_limits WHERE expires < ?").bind(now),
    ]);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
