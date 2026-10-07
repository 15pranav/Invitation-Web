import { requireChatGPTUser } from "../chatgpt-auth";
import { admin, readContent } from "@/lib/server";
import Experience from "../experience";
export const dynamic = "force-dynamic";
export default async function Preview() {
  await requireChatGPTUser("/preview");
  if (!(await admin()))
    return (
      <main className="access-page">
        <h1>Private preview.</h1>
        <a href="/">Return to invitation</a>
      </main>
    );
  try {
    const { content } = await readContent(true);
    return <Experience content={content} preview />;
  } catch {
    return (
      <main className="access-page">
        <h1>Preview is temporarily unavailable.</h1>
        <a href="/admin">Return to editor</a>
      </main>
    );
  }
}
