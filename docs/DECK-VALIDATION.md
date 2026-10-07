# Ceremonial deck and cinematic refinement validation — 4 October 2026

## Implemented
- Existing card face markup, engraved artwork, typography and palette retained. New outer motion carriers provide staggered stack arrival, visible edge offsets, restrained idle breathing, fan, lifted 3D flip, physical circular reordering with swipe velocity, gather, and gold movement trails.
- The 2.8-second departure fans, gathers, shuffles, aligns and flies cards past the camera. A short full-screen warm light mask bridges into Bhajans. Skip remains available, and reduced-motion bypasses the cinematic sequence.
- CMS Ceremonial cards tab supports adding custom or linked cards, editing overrides, duplication, visibility, deletion, handle-based drag ordering, and equivalent arrow/keyboard controls. Programme/bhajan changes flow through source references. Explicit deletions suppress automatic reappearance. Source removal is handled without crashing.
- Card data is stored in the existing versioned draft/published content JSON. Existing content gets a backwards-compatible default deck; no parallel backend or database migration is required. Published card artwork participates in the existing media visibility check.
- Diya ignition expands to a viewport-filling light mask before Ganesh is revealed. Birthday transition uses a growing golden light, a covered scene swap, and a receding light in the balloon world.
- Additional halo depth, slow rays, responsive floating petals, lamp illumination pulses, bell light-wave response, restrained camera parallax and balloon drag/spring motion. The deity remains stationary.
- Fixed an AudioContext cleanup rejection exposed by development reloads.

## Verification
- TypeScript check and production build passed.
- `node --experimental-strip-types tests/deck-content.mjs`: counts 0/1/3/10/20, display order, live source inheritance, overrides, hiding, source deletion, duplicate ID rejection, backwards compatibility.
- Existing API smoke suite: 11 checks passed, including authentication, origin checks, revision conflicts, draft/publish isolation, storage privacy, streaming and RSVP.
- Existing media suite: all six groups passed, including 6.73 MB multipart MP3 transfer, retry, idempotency, byte fidelity, range playback, size/type validation, non-JSON errors and cancellation.
- Actual browser at requested approximately 393×852 mobile viewport: initial stack, fan, flip, pointer swipe changing physical order, gather, complete departure and Skip, 3- and 10-card draft fixtures, 0-card graceful fallback and onward navigation. No horizontal page overflow. Browser reports 394 CSS pixels at this display scaling despite a 393-pixel override.
- Actual CMS UI: add/edit/duplicate/hide/delete, keyboard ordering and handle drag ordering. Test entries discarded. Original draft restored using revision-checked API writes; public content and personal media preserved.
- Actual opening, Ganesh, Darbar lamp/bell/flower interactions and birthday reveal inspected. No new console errors after the AudioContext fix; previous reload errors remain in retained browser history.

## Practical limits
- The responsive viewport and mouse/pointer drag tests are browser emulation, not measurements on a physical WhatsApp phone. Reduced motion and low-capability rendering paths are implemented; physical low-end device performance was not measured.
- Mata Rani remains the existing shallow curved relief texture in a genuine WebGL environment, not a newly sculpted GLB deity. Bloom uses inexpensive layered additive light rather than a full-screen post-processing pass.
- Production hosting is not claimed by this validation. Repository credential creation/push remains subject to the previously requested approval after automatic review blocked that action.

## Source locations
- `app/deck.tsx`: motion and input state machine.
- `lib/deck-content.ts`, `lib/content.ts`: reusable content resolution and validation.
- `app/admin/card-editor.tsx`: CMS deck controls.
- `app/deck-motion.css`: behavior, transition and CMS styles (original card face styles remain in globals.css).
- `app/experience.tsx`, `app/temple.tsx`: light continuity and environment interactions.
