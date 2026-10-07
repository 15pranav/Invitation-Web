import assert from "node:assert/strict";
const base = process.env.TEST_ORIGIN || "http://127.0.0.1:5174";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw Error("Local fixture test only");
const sign = await fetch(base + "/signin-with-chatgpt?return_to=/admin", {
  redirect: "manual",
});
const cookie = sign.headers.get("set-cookie").split(";")[0];
const headers = { cookie, origin: base, "content-type": "application/json" };
const draft = await (
  await fetch(base + "/api/admin/content", { headers })
).json();
const published = (await (await fetch(base + "/api/content")).json()).content;
let revision = draft.revision;
const put = async (content, publish = false) => {
  const r = await fetch(base + "/api/admin/content", {
    method: "PUT",
    headers,
    body: JSON.stringify({ content, publish, revision }),
  });
  const body = await r.json();
  if (r.ok) revision = body.revision;
  return r.status;
};
try {
  const fixture = structuredClone(draft.content);
  fixture.audio.scenes = {
    ...fixture.audio.scenes,
    finale: {
      url: fixture.audio.birthday || "https://example.com/qa-closing.mp3",
      enabled: true,
      continuePrevious: false,
      volume: 0.27,
      crossfade: 2.25,
    },
  };
  fixture.deck.cards.push({
    id: "qa-theme-card",
    source: "custom",
    sourceId: "",
    order: 119,
    enabled: true,
    title: "QA bronze ceremony",
    theme: "bronze",
  });
  assert.equal(await put(fixture), 200);
  const live = (await (await fetch(base + "/api/content")).json()).content;
  assert.deepEqual(live.audio, published.audio);
  const saved = (
    await (await fetch(base + "/api/admin/content", { headers })).json()
  ).content;
  assert.equal(saved.audio.scenes.finale.volume, 0.27);
  assert.equal(saved.deck.cards.at(-1).theme, "bronze");
  const bad = structuredClone(fixture);
  bad.audio.scenes.finale.volume = 2;
  assert.equal(await put(bad), 400);
  bad.audio.scenes.finale.volume = 0.27;
  bad.audio.scenes.finale.url = "javascript:alert(1)";
  assert.equal(await put(bad), 400);
  assert.equal(await put(fixture, true), 200);
  const updated = (await (await fetch(base + "/api/content")).json()).content;
  assert.equal(updated.audio.scenes.finale.crossfade, 2.25);
  assert.equal(updated.audio.scenes.finale.continuePrevious, false);
  console.log(
    "PASS CMS scene soundtrack/theme persistence, draft isolation, volume/URL validation, publication.",
  );
} finally {
  assert.equal(
    await put(published, true),
    200,
    "Revision-checked published restore",
  );
  assert.equal(await put(draft.content), 200, "Revision-checked draft restore");
  console.log("Original draft and publication restored.");
}
