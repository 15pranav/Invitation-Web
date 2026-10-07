# Refinement and upload validation — 4 October 2026

The existing React/Vinext, Workers, D1 and R2 architecture is retained. The public
ceremonial deck source hash remains
`325EECD6F6DA61BA8C11CD1DDE58D91A46D3BF2F7CC1CC8DE710CB82C092D091`.

## Upload diagnosis

The previous client posted one multipart/form-data body to `/api/admin/upload`.
Vinext 1.0.0-beta.5 runs `handleProgressiveServerActionRequest` for multipart POSTs
before this route and applies the default 1,048,576-byte action limit. In
`node_modules/vinext/dist/server/app-server-action-execution.js` lines 435–456,
it returns `payloadTooLargeResponse()`; that helper returns plain text
`Payload Too Large` with HTTP 413. Reproduced with a 1,100,000-byte form upload.
The previous application handler also had a 21 MiB request cap and 20 MiB file
cap, but neither was reached for normal music files. `await response.json()` in
the editor then hid the actual failure behind a parser error.

No framework request limit was raised.

## Current storage flow

`GET /api/admin/upload` supplies authoritative per-kind limits (25 MiB audio,
15 MiB images, 100 MiB video by default; UI calls these MB). Set server variables
`MEDIA_AUDIO_MAX_MB`, `MEDIA_IMAGE_MAX_MB`, `MEDIA_VIDEO_MAX_MB` to whole-number
limits. Safety ceilings are 100/30/500 respectively; invalid values use defaults.
Both client and server validate filename extension, MIME alias and exact size.
JPEG/PNG/WebP photos are resized in the browser before transport. All completed
objects receive a container-signature check and authoritative R2 size check.

1. JSON metadata creates an authenticated, owner-bound D1 session and R2 multipart
   upload; expiry one hour, at most ten pending sessions per administrator.
2. The browser transfers 5 MiB parts sequentially with progress and retry. The
   final part may be smaller. Retries do not restart the whole file.
3. With R2 signing secrets configured, parts go directly from the browser to R2
   through ten-minute SigV4 URLs scoped to an upload ID and part number.
4. Without signing secrets, the existing Workers R2 binding receives bounded raw
   PUT parts. This fallback still transits the Worker, but never sends an entire
   large track as a form body or buffers the entire file. There is one session,
   metadata, validation and completion system for both transports.
5. Completion verifies stored bytes, marks the session complete and returns the
   existing `/api/media/<uuid>` reference. Save draft / Publish retains its
   original semantics. Unpublished media still requires admin authentication;
   published audio retains range-request support. Privileged credentials stay
   server-side. No bucket is made public.
6. Cancel aborts incomplete uploads. Expired pending sessions are reaped in
   bounded batches on the next upload. Keep the bucket's incomplete-multipart
   lifecycle rule enabled as protection against abandoned browsers.

### Direct storage deployment

This project was provided only a managed `BUCKET` binding, not S3 signing keys.
The verified local path therefore uses the bounded R2-binding transport.
To enable direct transport, configure server-only `R2_UPLOAD_ACCOUNT_ID`,
`R2_UPLOAD_BUCKET`, `R2_UPLOAD_ACCESS_KEY_ID`, `R2_UPLOAD_SECRET_ACCESS_KEY` for
**the exact same bucket**. Scope credentials to object read/write on that bucket.
Use its S3 endpoint, not a public custom domain. Set R2 CORS to allow only your
invitation's exact HTTPS origin (and loopback only for local direct testing):
PUT method, Content-Type header, exposed ETag header. Bucket stays private.
Never prefix these secrets with NEXT_PUBLIC_ or put them in committed files.
This direct S3 path requires a deployed smoke test after credentials/CORS are
provisioned; it was not represented as live-tested during this local pass.

References: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
and https://developers.cloudflare.com/r2/api/s3/presigned-urls/ .

## Verification

- UI: uploaded a generated, silent 6.73 MiB MP3 through Bhajans & sound at 390 px;
  upload completed, Save draft persisted the URL, reload retained it; admin audio
  preview decoded 176.456875 seconds with readyState 4 and no media error.
- `node tests/media-upload.mjs`: boundary sizes, MIME aliases and extension
  validation, empty files, plain-text 413/HTML 502 handling, server limit,
  authentication and origin protections, 6.73 MiB multi-part upload, part retry,
  missing-part rejection, repeat completion, private draft, range playback,
  byte-identical retrieval, forged media rejection and cancellation.
- Test audio is a silent generated fixture compressed under tests/fixtures.
  It contains no private recording or copyrighted music.
- Updated API smoke tests use the same multipart protocol for images.
- Direct R2 S3 transport is implemented but unverified without its deployment
  credentials; local R2 multipart transport is verified.

## Visual scope and limits

Removed public initials and chapter numerals, eliminated the artificial loading
flash, added 5.5-second skippable ignition/light reveal, restrained Ganesh
illumination, layered Darbar halo/rays/architecture, small camera range with
inertia, physical bell sway, real flower asset with 4.5-second resting period,
and translucent balloons with knots/ribbons. Motion reduction and lower-power
rendering branches remain supported. No full sculpted deity GLB exists in this
project: the interim relief uses a transparent texture on a shallow contoured
mesh with separate environment layers. It must not be described as a fully
sculpted figurine. Generated asset prompts: refinement-artwork-prompts.txt.

## Final regression pass

Production build and TypeScript check passed. All 11 API smoke checks passed
again, along with all six upload/security test groups. The current family photo
and both current recording references were preserved; the earlier QA upload
reference was no longer present, so no user recording was removed.

Final 390 × 844 browser checks: Ganesh and birthday document widths were exactly
390 px without horizontal overflow; Darbar pointer drag remained constrained;
card tap revealed dinner details and a horizontal drag advanced to the Jyoti
card; birthday balloons/ribbons rendered with no console errors. Screenshots are
under `docs/screenshots/refined-darbar-mobile.jpg`, `preserved-deck-mobile.jpg`,
and `refined-birthday-mobile.jpg`.

Deployment remains pending: automatic approval review rejected creation of the
short-lived source repository write credential, specifically requiring explicit
user approval for credential creation and repository pushes. No live URL has
been claimed. The next authorized step is to create that temporary credential,
run the Sites source workflow, and publish the existing Site privately. Preserve
its project ID and current audience.
