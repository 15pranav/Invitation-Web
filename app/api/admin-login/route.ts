import { env } from "cloudflare:workers";
import { ADMIN_COOKIE, getAdminSessionValue } from "@/app/chatgpt-auth";

function safeReturn(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "/admin";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/admin";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");

  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return new Response("Incorrect password.", { status: 401 });
  }

  const session = await getAdminSessionValue();
  if (!session) {
    return new Response("Admin login is not configured.", { status: 500 });
  }

  const url = new URL(safeReturn(form.get("return_to")), request.url);

  return new Response(null, {
    status: 303,
    headers: {
      Location: url.pathname + url.search,
      "Set-Cookie": `${ADMIN_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
      "Cache-Control": "no-store",
    },
  });
}
