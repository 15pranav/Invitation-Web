import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { seed, EventContent, contentSchema } from "./content";
export function db() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new Error("Storage unavailable");
  return env.BUCKET;
}
export async function admin() {
  return await getChatGPTUser();
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function sameOrigin(r: Request) {
  const origin = r.headers.get("origin");
  return !!origin && origin === new URL(r.url).origin;
}
export async function boundedBody(r: Request, limit: number) {
  if (Number(r.headers.get("content-length") || 0) > limit)
    throw new RangeError("Request too large");
  const reader = r.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new RangeError("Request too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
export async function body(r: Request) {
  return JSON.parse(new TextDecoder().decode(await boundedBody(r, 250000)));
}
export async function readContent(
  draft = false,
): Promise<{
  content: EventContent;
  revision: number;
  publishedAt: string | null;
}> {
  const row = await db()
    .prepare(
      "SELECT draft,published,revision,published_at FROM event_content WHERE id = ?",
    )
    .bind("main")
    .first<{
      draft: string;
      published: string;
      revision: number;
      published_at: string | null;
    }>();
  return row
    ? {
        content: contentSchema.parse(
          JSON.parse(draft ? row.draft : row.published),
        ),
        revision: row.revision,
        publishedAt: row.published_at,
      }
    : { content: seed, revision: 0, publishedAt: null };
}
export async function ensureContent() {
  await db()
    .prepare(
      "INSERT OR IGNORE INTO event_content (id,draft,published,revision,updated_at) VALUES (?,?,?,?,?)",
    )
    .bind(
      "main",
      JSON.stringify(seed),
      JSON.stringify(seed),
      1,
      new Date().toISOString(),
    )
    .run();
}
export function failure(error: unknown) {
  console.error(
    "Application request failed",
    error instanceof Error ? error.message : "unknown",
  );
  return json(
    {
      error:
        "The service is temporarily unavailable. Please try again. Your changes have not been discarded.",
    },
    503,
  );
}


