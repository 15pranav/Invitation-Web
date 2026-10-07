import Experience from "./experience";
import { readContent } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  try {
    const { content } = await readContent();
    return {
      title: content.child + " · A Night of Blessings",
      description: `Mata Ka Jagran & ${content.child}'s second birthday. ${content.date} · ${content.venue}.`,
    };
  } catch {
    return { title: "A Night of Blessings" };
  }
}
export default async function Page() {
  try {
    const { content } = await readContent();
    return <Experience content={content} />;
  } catch (error) {
    console.error("Invitation unavailable", error);
    return (
      <main className="access-page">
        <p className="hindi">॥ जय माता दी ॥</p>
        <h1>A little pause.</h1>
        <p>
          Our invitation is temporarily unavailable. Please try again in a
          moment.
        </p>
        <a className="primary" href="/">
          Try again
        </a>
      </main>
    );
  }
}
