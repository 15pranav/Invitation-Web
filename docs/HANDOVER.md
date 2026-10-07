## Latest update: scrolling and chapter audio

Navigate vertically through the invitation. Configure optional soundtracks in **Bhajans & sound → Chapter soundtracks**, including independent final blessings, base volume and crossfades. Final blessings starts silent until configured. Sound On/Off is in the chapter menu. Card theme selection and automatic theme cycling preserve the existing artwork. See [SCENE-AUDIO-VALIDATION.md](SCENE-AUDIO-VALIDATION.md) for checks and practical limits.

## Latest update: physical ceremonial deck

The existing cards now stack, fan, flip, reorder with swipes, gather and depart through a short cinematic shuffle. Manage linked/custom cards in Admin → Ceremonial cards, then Save draft, Preview and Publish. Existing programme and bhajan data remain the sources for linked cards. See [DECK-VALIDATION.md](DECK-VALIDATION.md) for verification and limits. The light transitions and responsive Darbar/birthday environment are included.

# Chitraksh · A Night of Blessings

## Using the invitation

The opening lights a WebGL brass diya, then leads through Ganesh Ji, Maa’s Darbar, the ceremonial deck, bhajans, a light-to-balloon transition, birthday memories, venue/RSVP, and a family blessing. Chapter navigation lets guests revisit any moment. The experience is designed for touch, with keyboard alternatives for cards and navigation.

## Private family studio

Open `/admin` and sign in with the ChatGPT account whose email is **buriburishinchannohara@gmail.com**. This address is checked on the server for every administrator operation. A different signed-in account is denied.

- **Event & family:** edit date, child, venue, Maps link, contacts, invitation, hosts and singer/mandali.
- **Programme:** edit/add/remove/reorder ceremonies. Set Dinner, Jyoti, cake and Aarti times here. Jagran items become cards; birthday items appear in the birthday world.
- **Bhajans & sound:** manage the ordered bhajan list, individual recordings and contextual background audio. Bhajans also create cards.
- **Memories & media:** upload, caption, classify and reorder child/family photos, videos and audio. Supported files: JPEG, PNG, WebP, MP4, WebM, MP3, M4A, WAV and OGG, with configurable limits of 15 MB for images, 25 MB for audio and 100 MB for video. Uploads show progress and can be cancelled; recordings have an admin preview.
- **Experience settings:** toggle gallery, countdown, flower offering, bhajans, RSVP, birthday and sound. Configure RSVP availability and maximum party size.
- **Guest responses:** private attendance list, response count, confirmed guests and tentative guests.

**Save draft** stores edits without changing the live content. **Preview** saves a draft and opens a private preview. **Publish** atomically replaces the live content with the current draft. Concurrent edits are rejected rather than silently overwriting another save. Keep the editor open if a save fails; its fields retain your changes.

## Content still awaiting the family

Cake time is `00:00 PM`, Aarti time is `00:00 AM`, contacts are `+91 00000 00000`, and singer/mandali is `TBD`. These placeholders are retained in the CMS; the guest interface explains that confirmation is pending. Dinner is 8:30 PM and Jyoti Prachand is 9:15 PM on 17 October 2026. No final family photographs or bhajan recordings were fabricated. The memory world has a clearly labelled development placeholder until media is published.

Names transcribed from the invitation: श्री वीरेंद्र कुमार गुप्ता (दादा), वीना गुप्ता (दादी), सुशांत गुप्ता (पिता), अन्नू गुप्ता (माता). Please review the spelling in the editor before sharing with guests.

## Architecture and deployment

**Delivery status:** the runnable source, local preview, type checks and production build are complete. A private Site has been registered and the administrator allowlist configured. The final source-save/deploy workflow was rejected by automatic approval review with “approval required by policy,” including after a scoped Git/network permission grant. On 4 October, a fresh credential request was explicitly rejected because repository credential creation/push needs user approval. No successful live deployment URL has been produced. Resume publishing this same registered Site rather than creating another one.

The delivered application uses React, TypeScript, Three.js, Motion, Tailwind, and Next.js App Router conventions through Vinext. The available Sites hosting service runs it on Cloudflare Workers with D1 for durable content/RSVP records, R2 for uploads, and dispatch-owned ChatGPT authentication with an application email allowlist. This makes a real provisioned backend possible without requiring a separately supplied Supabase project.

This build is **not a drop-in Vercel/Supabase deployment**. For that target, replace the small server/auth/storage boundary (`lib/server.ts`, the media route, and the sign-in helpers) with Supabase/PostgreSQL equivalents and use Next.js rather than the Vinext build. The `EventContent` schema and public experience can remain intact.

The database stores one versioned content document with separate draft and published values, plus RSVP records and transient rate-limit counters. All editable event content is in that schema. Initial seed data is applied only when no document exists. User uploads are visible anonymously only after their URLs are referenced by published content. Unreferenced uploads remain private. Deleting an item removes it from the published experience after Publish; its underlying object is retained, so accidental removals are recoverable from a known URL rather than destructive.

## Visual and performance choices

- The diya, altar, pillars, lamps, particles, flower offerings and balloons are real procedural WebGL geometry. There are no heavy GLB downloads.
- Mata Rani is an original, stationary **2.5D contoured relief within the 3D Darbar**, not a fully sculpted 3D deity. Camera orbit is constrained to a reverent small arc, has inertia and returns slowly to idle movement after inactivity.
- The public scene is lazy-loaded; device pixel ratio and particles are reduced on weaker hardware. Rendering pauses when the document is hidden. Reduced-motion preferences disable idle movement and cinematic travel.
- Generated artwork is locally stored as optimized WebP. Fonts are self-hosted, including Devanagari. There are no external tracking scripts.
- Uploaded photos are automatically resized to a maximum 1600-pixel edge and encoded as WebP in the administrator’s browser before upload.
- Sound requires a user gesture. Without supplied recordings, the controller offers a quiet synthesized ambience and bell. Uploaded tracks crossfade between contexts. The public audio controller is custom; the private CMS includes listening previews.

## Validation performed

TypeScript checks and production compilation. Automated development integration checks cover administrator denial, origin validation, invalid content, draft isolation, revision conflicts, publishing dynamic content/visibility, unsafe upload types, R2 uploads, unpublished-media privacy, published media/range streaming, RSVP idempotency and aggregate counts, and server-enforced RSVP closure. Mobile screenshots and interactions were inspected for the opening, Ganesh sequence, Darbar, flower offering and deck. The refinement pass also tested real MP3 upload and decoding through the admin interface, inspected the birthday balloons, and verified WebMCP navigation. See `REFINEMENT-VALIDATION.md` for the current evidence and the unverified direct-S3 deployment boundary. Physical-device testing is still recommended.

## Sharing

The hosted deployment starts owner-private. Publishing CMS content does not change the hosting audience. Before sending the link through WhatsApp, change the Site’s sharing audience to the intended guests or public access. `/admin`, unpublished content and guest responses remain protected by the server allowlist. No invitation messages have been sent.

## Local development

Node 22.13+ and npm are required. Run `npm ci`, copy `.env.example` to `.env`, and set `ADMIN_EMAILS=seedy@sites.test` **only for the loopback development simulator**. Generate migrations with `npm run db:generate` when the schema changes. Run `npm run build` to create the local binding configuration, then apply the SQL files in `drizzle/` in order using Wrangler locally. Run `npm run dev`. The local simulator’s sign-in route creates the development account; this simulator is absent from production builds. Do not deploy a local development admin address.

Useful checks: `npx tsc --noEmit`, `npm run build`, and, with the local development server running, `node tests/api-smoke.mjs` plus `node tests/media-upload.mjs`. Both accept `TEST_ORIGIN` for a loopback preview on a different port. The integration script only accepts loopback origins, restores invitation content afterward and creates clearly named local QA guest records. Production migrations are applied by Sites during deployment.

See `artwork-prompts.txt` for the three original image-generation briefs. All three were generated with the built-in image tool. The supplied reference invitations were used for content only; the supplied child photograph is not used as a final gallery photo.
