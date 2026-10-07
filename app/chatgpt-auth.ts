import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export const ADMIN_COOKIE = "celebration-admin";
const SIGN_IN_PATH = "/admin-login";
const SIGN_OUT_PATH = "/admin-logout";

export async function getAdminSessionValue(): Promise<string | null> {
  const password = env.ADMIN_PASSWORD || "";
  if (!password) return null;

  const bytes = new TextEncoder().encode(`celebration:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const expected = await getAdminSessionValue();
  if (!expected) return null;

  const store = await cookies();
  const actual = store.get(ADMIN_COOKIE)?.value;

  if (!actual || actual !== expected) return null;

  return {
    userId: "family-admin",
    displayName: "Family Admin",
    email: "admin@celebration.local",
    fullName: "Family Admin",
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }

  if (url.origin !== "https://app.local") return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}
