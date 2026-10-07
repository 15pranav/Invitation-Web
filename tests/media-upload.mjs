import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import {
  validateMedia,
  mediaSignature,
  defaultPolicy,
  MB,
} from "../lib/media-policy.ts";
import { readJSON } from "../lib/http-client.ts";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:5173";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw Error("Loopback tests only.");
const signin = await fetch(origin + "/signin-with-chatgpt?return_to=/admin", {
  redirect: "manual",
});
const cookie = signin.headers.get("set-cookie").split(";")[0];
const headers = { cookie, origin, "Content-Type": "application/json" };
const call = (path, data, h = headers) =>
  fetch(origin + path, {
    method: "POST",
    headers: h,
    body: JSON.stringify(data),
  });
const tests = [];
assert.equal(
  validateMedia({ name: "track.MP3", type: "audio/mp3", size: 25 * MB }).type,
  "audio/mpeg",
);
assert.throws(
  () => validateMedia({ name: "track.mp3", type: "audio/mpeg", size: 26 * MB }),
  /25 MB/,
);
assert.throws(
  () => validateMedia({ name: "track.exe", type: "audio/mpeg", size: 100 }),
  /Choose/,
);
assert.throws(
  () => validateMedia({ name: "track.mp3", type: "text/html", size: 100 }),
  /Choose/,
);
assert.throws(
  () => validateMedia({ name: "track.mp3", type: "audio/mpeg", size: 0 }),
  /empty/,
);
tests.push("audio size boundary, extensions, MIME aliases and empty files");
await assert.rejects(
  readJSON(new Response("Payload Too Large", { status: 413 })),
  /upload service/,
);
await assert.rejects(
  readJSON(new Response("<html>gateway error</html>", { status: 502 })),
  /502/,
);
tests.push("plain text and HTML errors never surface JSON parse failures");
let r = await call("/api/admin/upload", {
  name: "track.mp3",
  type: "audio/mpeg",
  size: 26 * MB,
});
assert.equal(r.status, 400);
assert.match((await r.json()).error, /25 MB/);
r = await call(
  "/api/admin/upload",
  { name: "track.mp3", type: "audio/mpeg", size: 200 },
  { origin, "Content-Type": "application/json" },
);
assert.equal(r.status, 403);
r = await call(
  "/api/admin/upload",
  { name: "track.mp3", type: "audio/mpeg", size: 200 },
  { ...headers, origin: "https://untrusted.invalid" },
);
assert.equal(r.status, 403);
tests.push("server size enforcement, anonymous and cross-origin rejection");
const bytes = gunzipSync(await readFile("tests/fixtures/silence.mp3.gz"));
assert.ok(mediaSignature(bytes, "audio/mpeg"));
const create = async (data) => readJSON(await call("/api/admin/upload", data));
const s = await create({
  name: "qa.mp3",
  type: "audio/mpeg",
  size: bytes.length,
});
assert.equal(s.direct, false);
const endpoint = "/api/admin/upload/" + s.id;
r = await call(endpoint, { action: "complete" });
assert.equal(r.status, 409);
r = await fetch(origin + endpoint + "?part=1", {
  method: "PUT",
  headers: { cookie, origin },
  body: bytes.subarray(0, 100),
});
assert.equal(r.status, 400);
const receipts = [];
for (let offset = 0, n = 1; offset < bytes.length; offset += s.partSize, n++) {
  r = await fetch(origin + endpoint + "?part=" + n, {
    method: "PUT",
    headers: { cookie, origin, "Content-Type": "application/octet-stream" },
    body: bytes.subarray(offset, offset + s.partSize),
  });
  assert.equal(r.status, 200);
  receipts.push(await r.json());
  if (n === 1) {
    r = await fetch(origin + endpoint + "?part=" + n, {
      method: "PUT",
      headers: { cookie, origin },
      body: bytes.subarray(offset, offset + s.partSize),
    });
    assert.equal(r.status, 200);
  }
}
const result = await readJSON(await call(endpoint, { action: "complete" }));
assert.equal(result.type, "audio");
assert.deepEqual(
  await readJSON(await call(endpoint, { action: "complete" })),
  result,
);
assert.equal((await fetch(origin + result.url)).status, 404);
r = await fetch(origin + result.url, {
  headers: { cookie, Range: "bytes=0-1023" },
});
assert.equal(r.status, 206);
assert.equal((await r.arrayBuffer()).byteLength, 1024);
const downloaded = Buffer.from(
  await (
    await fetch(origin + result.url, { headers: { cookie } })
  ).arrayBuffer(),
);
assert.deepEqual(downloaded, bytes);
tests.push(
  "6.73 MB multipart transfer, part retry, incomplete protection, idempotent completion, private draft, byte-for-byte fidelity and range playback",
);
const bad = await create({ name: "fake.mp3", type: "audio/mpeg", size: 12 });
r = await fetch(origin + "/api/admin/upload/" + bad.id + "?part=1", {
  method: "PUT",
  headers: { cookie, origin },
  body: "<html></html",
});
assert.equal(r.status, 200);
r = await call("/api/admin/upload/" + bad.id, { action: "complete" });
assert.equal(r.status, 400);
assert.equal(
  (await fetch(origin + "/api/media/" + bad.id, { headers: { cookie } }))
    .status,
  404,
);
tests.push("forged media content rejected and removed");
const cancelled = await create({
  name: "cancel.mp3",
  type: "audio/mpeg",
  size: 100,
});
r = await fetch(origin + "/api/admin/upload/" + cancelled.id, {
  method: "DELETE",
  headers,
});
assert.equal(r.status, 200);
r = await call("/api/admin/upload/" + cancelled.id, { action: "complete" });
assert.equal(r.status, 404);
tests.push("cancel aborts R2 multipart upload");
console.log(tests.map((t) => "PASS " + t).join("\n"));
