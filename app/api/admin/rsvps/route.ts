import { admin, db, json, failure } from "@/lib/server";
export async function GET() {
  try {
    if (!(await admin()))
      return json({ error: "Administrator access required." }, 403);
    const rows = await db()
      .prepare("SELECT * FROM rsvps ORDER BY created_at DESC")
      .all();
    const counts = await db()
      .prepare(
        "SELECT COUNT(*) responses,COALESCE(SUM(CASE WHEN attendance='yes' THEN guests ELSE 0 END),0) confirmedGuests,COALESCE(SUM(CASE WHEN attendance='maybe' THEN guests ELSE 0 END),0) tentativeGuests FROM rsvps",
      )
      .first();
    return json({ rows: rows.results, counts });
  } catch (e) {
    return failure(e);
  }
}
