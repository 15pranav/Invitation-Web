import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.TEST_ORIGIN || "http://127.0.0.1:5173";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw Error("This test writes fixtures; loopback development only.");
const anon = await fetch(base + "/api/admin/content");
assert.equal(anon.status, 403);
const signin = await fetch(base + "/signin-with-chatgpt?return_to=/admin", {
  redirect: "manual",
});
const cookie = signin.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Local preview auth cookie");
const headers = { cookie, origin: base, "Content-Type": "application/json" };
const get = async () => {
  const r = await fetch(base + "/api/admin/content", { headers });
  assert.equal(r.status, 200);
  return r.json();
};
const original = await get();
const originalPublished = (await (await fetch(base + "/api/content")).json())
  .content;
let revision = original.revision;
let fixture = structuredClone(original.content);
const save = async (content, publish = false, rev = revision, origin = base) =>
  fetch(base + "/api/admin/content", {
    method: "PUT",
    headers: { ...headers, origin },
    body: JSON.stringify({ content, revision: rev, publish }),
  });
const tests = ["anonymous admin blocked"];
try {
  assert.equal(
    (await save(fixture, false, revision, "https://untrusted.invalid")).status,
    403,
  );
  tests.push("cross-origin writes blocked");
  assert.equal((await save({ ...fixture, date: "not-a-date" })).status, 400);
  tests.push("invalid content rejected");
  fixture.invitation = "QA draft isolation";
  let r = await save(fixture);
  assert.equal(r.status, 200);
  revision = (await r.json()).revision;
  let publicContent = await (await fetch(base + "/api/content")).json();
  assert.equal(publicContent.content.invitation, original.content.invitation);
  assert.equal((await get()).content.invitation, fixture.invitation);
  tests.push("draft isolated from live content");
  assert.equal((await save(fixture, false, revision - 1)).status, 409);
  tests.push("stale revision conflict blocked");
  fixture.programme.push({
    id: "qa-programme",
    title: "QA ceremony",
    hindi: "",
    time: "TBD",
    description: "Test fixture",
    kind: "katha",
    world: "jagran",
  });
  fixture.bhajans.push({
    id: "qa-bhajan",
    title: "QA bhajan",
    singer: "TBD",
    url: "",
    description: "Test fixture",
  });
  fixture.features.gallery = false;
  r = await save(fixture, true);
  assert.equal(r.status, 200);
  revision = (await r.json()).revision;
  publicContent = await (await fetch(base + "/api/content")).json();
  assert.equal(publicContent.content.programme.at(-1).id, "qa-programme");
  assert.equal(publicContent.content.bhajans.at(-1).id, "qa-bhajan");
  assert.equal(publicContent.content.features.gallery, false);
  tests.push("publish delivers programme, bhajans and visibility");
  r = await fetch(base + "/api/admin/upload", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "unsafe.svg",
      type: "image/svg+xml",
      size: 6,
    }),
  });
  assert.equal(r.status, 400);
  tests.push("unsafe upload type rejected");
  const imageBytes = await readFile("public/art/ganesh-ji.webp");
  r = await fetch(base + "/api/admin/upload", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "qa-art.webp",
      type: "image/webp",
      size: imageBytes.length,
    }),
  });
  assert.equal(r.status, 200);
  const session = await r.json();
  r = await fetch(base + "/api/admin/upload/" + session.id + "?part=1", {
    method: "PUT",
    headers: { cookie, origin: base },
    body: imageBytes,
  });
  assert.equal(r.status, 200);
  r = await fetch(base + "/api/admin/upload/" + session.id, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "complete" }),
  });
  assert.equal(r.status, 200);
  const uploaded = await r.json();
  assert.equal((await fetch(base + uploaded.url)).status, 404);
  assert.equal(
    (await fetch(base + uploaded.url, { headers: { cookie } })).status,
    200,
  );
  tests.push("file storage and unpublished media privacy");
  fixture.media.push({
    id: "qa-upload",
    title: "QA upload",
    caption: "",
    url: uploaded.url,
    type: "image",
    category: "memory",
  });
  r = await save(fixture, true);
  revision = (await r.json()).revision;
  assert.equal((await fetch(base + uploaded.url)).status, 200);
  const partial = await fetch(base + uploaded.url, {
    headers: { Range: "bytes=0-15" },
  });
  assert.equal(partial.status, 206);
  assert.equal((await partial.arrayBuffer()).byteLength, 16);
  tests.push("published media and byte-range streaming");
  const id = crypto.randomUUID();
  const response = {
    id,
    name: "QA Local Test Guest",
    attendance: "yes",
    guests: 2,
    website: "",
  };
  r = await fetch(base + "/api/rsvp", {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: JSON.stringify(response),
  });
  assert.equal(r.status, 200);
  r = await fetch(base + "/api/rsvp", {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: JSON.stringify(response),
  });
  assert.equal(r.status, 200);
  const rows = await (
    await fetch(base + "/api/admin/rsvps", { headers })
  ).json();
  assert.equal(rows.rows.filter((x) => x.id === id).length, 1);
  assert.ok(rows.counts.confirmedGuests >= 2);
  tests.push("RSVP stored exactly once and aggregated");
  fixture.rsvp.enabled = false;
  r = await save(fixture, true);
  revision = (await r.json()).revision;
  r = await fetch(base + "/api/rsvp", {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ ...response, id: crypto.randomUUID() }),
  });
  assert.equal(r.status, 403);
  tests.push("closed RSVP enforced server-side");
} finally {
  const current = await get();
  assert.equal(
    current.revision,
    revision,
    "Do not overwrite a concurrent editor",
  );
  const restored = await save(originalPublished, true, current.revision);
  assert.equal(restored.status, 200, "restore published content");
  const restoredRevision = (await restored.json()).revision;
  assert.equal(
    (await save(original.content, false, restoredRevision)).status,
    200,
    "restore original draft separately",
  );
}
console.log(JSON.stringify({ passed: tests.length, tests }, null, 2));
