import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { admin } from "@/lib/server";
import Editor from "./editor";
export const dynamic = "force-dynamic";
export default async function Admin() {
  await requireChatGPTUser("/admin");
  const user = await admin();
  if (!user)
    return (
      <main className="access-page">
        <p className="eyebrow">PRIVATE FAMILY STUDIO</p>
        <h1>Administrator access only.</h1>
        <p>Please sign in with the email approved for this invitation.</p>
        <a
          className="primary"
          href={chatGPTSignOutPath("/admin")}
          target="_top"
        >
          Use another account
        </a>
        <a href="/">Return to invitation</a>
      </main>
    );
  return <Editor name={user.displayName} />;
}
