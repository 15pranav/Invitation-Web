export const dynamic = "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const params = await searchParams;
  const returnTo =
    params.return_to?.startsWith("/") && !params.return_to.startsWith("//")
      ? params.return_to
      : "/admin";

  return (
    <main className="access-page">
      <p className="eyebrow">PRIVATE FAMILY STUDIO</p>
      <h1>Administrator sign in.</h1>
      <p>Enter the private password to manage this invitation.</p>

      <form method="POST" action="/api/admin-login">
        <input type="hidden" name="return_to" value={returnTo} />
        <input
          type="password"
          name="password"
          placeholder="Admin password"
          required
          autoFocus
        />
        <button className="primary" type="submit">
          Enter Admin Studio
        </button>
      </form>

      <a href="/">Return to invitation</a>
    </main>
  );
}
