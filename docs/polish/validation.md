# Invitation polish — local validation

Branch: astra-polish. No push, merge, deployment, remote database, or secret changes.

## Local commits

1. d477ec7 — fix: smooth ceremonial deck depth reorder
2. 5550e38 — fix: sharpen responsive Ganesh rendering
3. 0f8b73a — feat: cinematic Ganesh cloud reveal and aura
4. 4046b40 — fix: improve Darbar mobile composition and petals
5. 0bf3e8c — fix: unify balloon transition system
6. This report accompanies: fix: improve scroll interpolation and scene crossfades

## Files changed

- Deck: app/deck.tsx, app/deck-motion.css.
- Ganesh and choreography: app/experience.tsx, app/refinements.css.
- Darbar: app/temple.tsx, app/darbar-petals.tsx, app/journey.css.
- Shared balloons: app/balloon-model.ts, app/balloon-motion.ts, app/balloon-veil.tsx, tests/balloon-motion.mjs.
- Scroll: app/scene-scroll.tsx, app/scene-progress.ts, app/journey-layer.tsx, app/globals.css, tests/scene-progress.mjs.
- Verification: docs/polish/validation.md, docs/polish/darbar-mobile.png.

## Findings and implementation

### Deck depth

The deck flattened its 3D children while assigning the departing card an elevated z-index until a timer expired. Its translateZ therefore did not produce continuous occlusion; removing that elevated layer caused the final pop. Reverse cycling also identified the incoming card rather than the outgoing selected card. All cards now share preserved 3D space, use positive depth for reliable Chromium hit testing, and interpolate their depth together. The departing card makes a restrained lateral movement while moving behind its neighbours. Native image dragging is disabled and the cards retain gesture ownership, preventing pointer cancellation. Side-card selection, centred reveal, both swipe directions, and arrows were exercised.

### Ganesh sharpness

The same 1000×1000 WebP is used on mobile and desktop; there was no smaller mobile asset. At 375×812, its measured display size was about 250×250 CSS pixels, sufficient source pixels even for a 3× screen. Continuous subpixel image movement, animated opacity, a parent brightness filter, and a mask fading into the artwork compounded softness. The image now remains static and fully opaque after its reveal, without that parent filter; the mobile square aspect and broader opaque mask preserve the artwork. The aura moves separately. Visual comparison and computed styles were checked at browser DPR 1; a physical DPR 3 device was not tested.

### Darbar composition

Four pillars remain. On mobile, the rear pair moves to x ±2.08, z −1.8 and scales to (.64,.92,.64); the front pair uses x ±2.35, z .45. Desktop retains the original positions. This creates depth without shrinking the entire shrine. The central red/gold field and aura strengths increase while edges stay dark. The 320px and 375px layouts were inspected; title, face, flower and bell controls remained accessible. Drag-to-look-around, the decorative bell, and the labelled bell control were exercised.

### Petals

Removed the separate nearly stationary 3D floating petals, pointer repulsion, and independent offering-flight effect. One deterministic system uses the same falling petal treatment for 18 ambient and 14 surge particles. Offer a flower boosts that system, then returns it to baseline. The intentional rose garland lying on the altar remains. Stable seeded positions avoid random hydration changes.

### Shared balloons

The existing THREE geometry, shader, palette, neck, and curved string now live in one factory used by the normal birthday scene and foreground transition. Sixteen foreground balloons rise, approach the camera, overlap, then continue upward until their strings clear the viewport. No separate CSS balloon artwork remains. Rendering is capped at DPR 1.5 for the foreground layer. WebGL failure falls back to a crossfade.

Raycasting against the actual shared balloon geometry sampled a 31×31 viewport grid at 320×740, 375×812, 1280×900, and 1536×726. Coverage was 100% at 1450, 1750, and 2050ms. This measures silhouette coverage, not opaque occlusion: the preserved translucent balloon material still transmits some background light. Upward monotonic motion and complete string exit were also tested.

### Scroll architecture

One native scroll position drives adjacent mounted backgrounds, chapter opacity, small vertical translation, shared scene intensity, and balloon progress. Native CSS snap is disabled. After 150ms without input, a cancellable cubic ease-out settles in 340–580ms; touch holds defer settling. Gesture movement is bounded to the neighbouring chapters. Reduced motion skips interpolation. Programmatic chapter navigation retains its existing special choreography and uses simultaneous 600ms crossfades for ordinary changes. A final native scroll event at the resting position is ignored so it cannot leave controls inert. Backgrounds overlap instead of waiting for the old chapter to unmount. Keyboard navigation, partial release, reversal, and rapid repeated input were exercised.

## Timing (normal speed)

- Deck reorder: 600ms, shared by departing and surrounding cards.
- Opening cloud reveal: 2200ms. Image becomes visible through the clearing cloud; no image blur animation.
- Ganesh aura breath: 7s. Sparse ambient cloud drift: 24s. Rare star: 32s cycle, initial 17s delay.
- Petal boost: 300ms activation, 2s fade back; ambient falls take 9–19s.
- Button balloon transition: coverage/scene switch at 1450ms; coverage hold through 2050ms; complete upward exit at 3600ms. Outgoing copy fades over 200ms.
- Finale relative to its scene mount: body reveal starts at 600ms and fades for 600ms; ignition clock starts at 1450ms; visible flame develops from 1630 to 3000ms; warm glow builds from 2050 to 2950ms; blessing text begins at 2650ms and fades for 700ms. For the button transition, add the 1450ms covered scene-switch offset to these values.
- Scroll balloon motion maps progress 0–1 to the same 0–3600ms choreography; background blend spans progress .40–.57, outgoing copy .00–.14, incoming copy .63–.88. User input controls elapsed wall time. Finale lighting starts after settling, so its duration is not compressed by a quick gesture.
- Existing Darbar blessing bridge remains 2350ms with scene switch at 1450ms; existing birthday entry remains 4400ms with switch at 2300ms.

## Validation results

- Production build: PASS, all five build stages and application routes completed. Build warns about large chunks and plugin timing; no deployment performed.
- TypeScript no-emit check: PASS.
- New scroll, layer, balloon, and petal component lint checks: PASS.
- Broader lint on affected existing components: NOT CLEAN — 8 errors and 12 warnings, including render-time ref writes and effect state updates in deck/experience/temple, effect dependency warnings, and native-image advisories. These patterns were not broadly rewritten as part of visual polish.
- Deck content tests: PASS.
- Scene audio tests: PASS with Node experimental-transform-types (strip-only mode cannot parse the existing constructor parameter property).
- Balloon geometry coverage / rise / exit tests: PASS.
- Scroll interval / reverse settle / flick projection / boundary tests: PASS.
- Scene CMS integration test: FAIL, local write/restore request returned HTTP 403. No remote endpoint was used. This is not counted as a successful CMS regression test.
- Browser: inspected 320px and 375px mobile layouts and 1280px desktop; exercised deck gestures/reveal/arrows, shrine controls/look-around, ordinary chapter navigation, scroll settling/reversal, balloon transitions, and finale. Final browser error log was empty.
- Saved proof: darbar-mobile.png (375×812).

## Deferred and acceptance limits

No known type or build failure remains. Lint is not fully clean and the CMS integration check is unresolved. Reduced-motion branches were inspected in code, but the available browser controls did not provide an OS reduced-motion emulation check. Physical iOS/Android, high-DPR image sharpness, sustained low-end-device frame rate, and screen-reader interaction were not measured. Silhouette coverage passes the numerical coverage target; a claim of 98–99% opaque blackout would not be justified with the deliberately shared translucent material. These are explicit verification limits rather than claimed passes.
