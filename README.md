# Chitraksh · A Night of Blessings

A cinematic, mobile-first Mata Ka Jagran and second-birthday invitation with a real CMS, file storage and RSVP backend.

Read [the handover guide](docs/HANDOVER.md) for administrator access, content editing, deployment, known limits and validation.

## Project map

- `app/experience.tsx`: continuous invitation journey and chapter navigation
- `app/temple.tsx`: lazily loaded Three.js temple, diya, petals and balloons
- `app/deck.tsx`: touch/swipe/fan/flip ceremonial deck
- `app/audio.ts`: gesture-gated ambience, bell and track crossfades
- `app/admin/`: private CMS
- `app/api/`: authenticated content/uploads and public RSVP/media endpoints
- `lib/content.ts`: validated content schema, seed and formatting helpers
- `lib/server.ts`: isolated authentication/database/storage boundary
- `db/schema.ts`, `drizzle/`: database schema and migrations
- `tests/api-smoke.mjs`: loopback-only backend integration checks
- `public/art/`, `public/fonts/`: optimized local artwork and typography

## Commands

```sh
npm ci
npm run dev
npm run build
npx tsc --noEmit
node tests/api-smoke.mjs
```

The local D1 database must be migrated before the first preview; follow `docs/HANDOVER.md`. The deployed service uses Sites-managed Workers, D1, R2 and authentication, rather than requiring unprovided Supabase credentials. Content is independent of presentation and can be migrated without re-entering event data.


Upload limits, direct R2 configuration, the multipart fallback, and refinement checks are documented in [docs/REFINEMENT-VALIDATION.md](docs/REFINEMENT-VALIDATION.md).
