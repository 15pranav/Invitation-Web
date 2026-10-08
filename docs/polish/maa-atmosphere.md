# Maa Darbar atmosphere pass

Implemented on maa-atmosphere, preserving the existing deity image, composition and interaction handlers. Visual acceptance remains pending browser inspection.

## Layers

- Wine environment: #4A0E17 / #210408 / #0D0204, with dark side recesses.
- Amber/crimson air halo behind the existing transparent temple canvas. Existing WebGL aura and radial rays are reused.
- Three bounded gradient haze planes at the sides/lower altar; two masked floor-reflection bands.
- 18 deterministic warm dust points on desktop, 12 at widths <=700px. These replace Maa's previous 35/90 WebGL points rather than adding a second particle field. Other scenes retain their particles.
- Existing 32 mandala petals reuse their geometry and receive a slightly warmer material and slow group rotation.
- Three tiny anchored crown/halo glints use the existing renderer and cleanup lifecycle.

The atmosphere is a child of the existing Darbar background JourneyLayer: above that element's background paint and below the later scene canvas/UI. It inherits existing fade/scrub visibility, has no negative z-index, is aria-hidden and ignores pointer events. No navigation, offering, bell, audio, camera/look-around or other-scene choreography was edited.

## Timing

- Halo: 8-second full breath; existing WebGL aura adds only +/-1.6% idle scale. Existing travel target remains 1.35.
- Rays: angularly staggered selective highlights, 2*pi/0.55 = 11.424 seconds per cycle; existing ray structure and slow drift retained.
- Mist far/near/low: 43 / 31 / 49 seconds for an entire out-and-back cycle (21.5 / 15.5 / 24.5-second alternate legs).
- Reflection bands: 23 / 29-second out-and-back cycles (11.5 / 14.5-second legs).
- Mandala: 72 seconds per full rotation.
- Dust: mostly static faint points; selected points twinkle with deterministic 5.7 + (index mod 6)*0.83-second timing. Rising subset: 17 seconds. Negative phase offsets prevent synchronized starts.
- Glints: 0.85-second soft flashes at 19 / 27 / 31-second intervals, staggered by 5 / 14 / 23-second phase offsets.

The user's explicitly requested slow cinematic rhythms take precedence over the generic motion skill's short UI timing tokens. No UI chrome animation is changed.

## Mobile and performance

Mobile hides six dust nodes, crops side mist away from the central subject, broadens the halo to fit the narrow composition, and reduces reflection opacity from .38 to .30. Background layers cannot intercept controls. CSS animates only transform/opacity; gradients and masks are static. No blur filters, shadow animation, additional frame loop, per-frame layout queries or React state updates were added. Existing mandala geometry is reused; glints add three small planes, with tracked geometry/material disposal. Hardware frame pacing has not been measured.

Reduced motion disables all new CSS animations, freezes mandala/aura/ray motion through the existing reduced-motion clock, and suppresses glint flashes while retaining static atmosphere.

## Validation

- TypeScript no-emit: passed.
- Production build: passed (existing large-chunk advisory).
- Existing balloon motion/coverage, actual scroll gesture listeners, scene progress, scene audio and deck-content tests: passed.
- New atmosphere component and layout ESLint: passed. Temple/experience lint rule/message results exactly match HEAD; pre-existing hook/image/unused-import diagnostics remain.
- Diff whitespace check: passed. Final diff reviewed for scope; offering, petal, audio and gesture implementations are unchanged.
- Static review supports intended stacking, pointer pass-through, deterministic density and reduced-motion paths.

NOT visually verified: mobile/desktop atmosphere visibility and balance, actual glint alignment, flower offering and bell interaction in-browser, transition blank-frame absence, reduced-motion rendering and mobile frame pacing. The browser tool fails at startup with windows sandbox setup refresh / helper_unknown_error. No screenshots or visual-pass claims are supplied; final visual acceptance remains open.

## Mobile visibility correction

The user-supplied rendered screenshot after 6a5dc83 is the visual baseline. It confirms the initial pass was too faint. This correction continues that work, without replacing the composition.

- Mobile mist's primary lobe was centered outside the viewport (left -34% plus 24% of an 83%-wide layer). It now centers about 14.5% into the viewport (left -22% plus 44% of 83%). Opposite-side haze occupies the lower right. Layer tops move to 48%/51%, concentrating light around lower architecture and altar. Broader multi-stop gradients give the haze a lit core and wine-colored falloff.
- Stronger amber/crimson air light is balanced by deeper outer recesses; this is localized contrast, not a global exposure or saturation change.
- Reflection had compounded low gradient, parent, animation and mask opacity. Stronger localized left/right gold reflections and warmer bands now use .66 mobile parent opacity (previously .30), with an 18%-high bounded area near the platform.
- Existing radial highlights now range from .55 to 2.20 of their base contribution, versus 1 to 1.48; most rays dim while selected sectors brighten. No additional ray geometry or lights.
- Existing forward pillar cylinders gain warmer satin material response to the existing lighting. Geometry, placement, rear brass and deity image are unchanged.
- Dust count remains 12 mobile/18 desktop; static opacity .44, rising peak .55, selected twinkle peak .85. Small glow sprites are 4px, not more particles.
- Three rare glint planes increase from .16 to .24 world units, with peak strength .95 instead of .65. Timing and anchors are preserved.

Stacking: atmosphere remains inside the Darbar background layer, now explicitly z-index:0 within that parent. Background paint is below its children; the later transparent scene canvas, Maa/altar/architecture, text and controls remain above. No negative z-index or scene-wrapper ordering changes. Pointer-events:none retained.

Timings unchanged: halo 8s, staggered ray highlight 11.424s, mist 43/31/49s full return cycles, reflection 23/29s full return cycles, mandala 72s, dust rise 17s, deterministic twinkle formula 5.7+(index mod 6)*.83s, glint flashes .85s at 19/27/31s intervals.

No additional DOM nodes, per-frame state, frame loops, animated filters, geometry systems or lights. Two cloned pillar materials use existing tracked disposal. Reduced-motion CSS disables all atmosphere animation and retains the stronger static light/dust; the existing reduced clock freezes WebGL effects and suppresses glints.

Correction validation: typecheck and production build passed (large-bundle advisory remains). Existing scene-scroll-gestures, scene-progress, balloon-motion, scene-audio and deck-content suites passed. Diff check passed. Flower offering, bell, look-around and navigation implementations are untouched; runtime offering behavior is not newly verified.

Browser inspection was retried and failed before initialization with windows sandbox helper_unknown_error / setup refresh had errors. No new mobile screenshot could be captured. Visible balance, flower interaction, reduced-motion rendering and hardware frame pacing remain unverified; compilation is not visual acceptance.

## Layered sacred environment pass

Continued from efdfd52, using the user's latest mobile screenshot as the baseline. This pass adds actual supporting environment shapes rather than another global color/light adjustment.

New elements: two small suspended brass diya illustrations with fine chains and warm light pools; a double ornamental temple arch with lotus-like crest and diamond foot details; two reusable three-contour SVG cloud banks layered over the existing side haze. The right bank is mirrored. Mobile cloud planes are 37% high, with the existing low mist retained as a separate plane.

Depth: dark recesses and air halo remain distant, arch and hanging lights sit behind the main composition, cloud banks occupy the lower side architecture, and reflected pools blend the altar base into the environment. Existing foreground petals, Maa/tiger/altar, title, buttons and their layout are untouched. Everything added remains inside the existing non-interactive background atmosphere context.

The latest screenshot exposed rectangular haze boundaries. Explicit closest-side elliptical masks now feather halo and mist to zero at their box edges. Floor reflections use four localized elliptical pools instead of repeating straight stripes. No animated filters or blur were added.

New motions: left/right suspended lights sway only +/-1.2 degrees over 18/23-second full return cycles. Lamp light pools vary opacity over 14/18-second full return cycles with offset phases. Ornamental line highlights shimmer over 13 seconds. Existing independent cloud drift, aura breathing, mandala rotation, dust rise and rare glints retain their previous timings. The reduced-motion rule disables all new descendant CSS animations while leaving the static environment visible.

Performance: static inline SVG paths/gradients, existing reusable haze planes, transform/opacity animation only, no React animation state, additional WebGL renderer, asset downloads, or per-frame layout reads. Mobile dust remains 12 points.

Validation: typecheck, production build, atmosphere component lint and diff check passed. Existing actual scroll-listener, scene-progress, scene-audio, balloon-motion and deck-content tests passed. Production build retains its large-chunk advisory. This pass changes only the atmosphere component/styles and this report. Offering, bell and scroll implementations were not edited. Scroll and bell-audio behavior are covered by existing tests; flower and bell pointer interactions were not verified in-browser.

Browser preview was retried and failed at startup with Windows sandbox helper_unknown_error / setup refresh had errors. Therefore no new screenshot, visual acceptance, or measured mobile frame-pacing claim is made. Supplied images guided implementation; visual comparison of the new render remains pending.
