# Balloon refinement completion — 8 October 2026

Resumed the existing worktree on astra-polish at 8639ca6. No approved scene architecture or choreography was changed during this completion.

## Unfinished work found and completed

The worktree already contained a 25-balloon layout, three depth/size classes, shared palette templates, reusable pose objects, unchanged-progress redraw skipping, hidden-document rendering suppression, shader precompilation, and deduplicated geometry disposal. These changes were retained. Completion consisted of reviewing the diff, formatting only the unfinished files, correcting a lint issue in the unfinished listener test harness, adding resource-lifetime/allocation regression assertions, rerunning validation, and documenting results. No additional visual redesign was needed.

## Exact files in the completion commit

- app/balloon-model.ts — dispose shared geometry once; formatting.
- app/balloon-motion.ts — size distribution, 25-balloon deterministic layout, reusable output pose; formatting.
- app/balloon-veil.tsx — shared palette templates, reusable poses, conditional rendering and shader compilation; formatting.
- tests/balloon-motion.mjs — updated count and coverage; resource-sharing, single-disposal, reusable-pose and unchanged-timing assertions.
- tests/scene-scroll-gestures.mjs — existing unfinished listener regression harness; local module variable renamed to satisfy lint. Scroll production code was not changed.
- docs/polish/correction/atmosphere-mobile.png — preserved earlier correction-pass evidence.
- docs/polish/correction/flower-mobile.png — preserved earlier correction-pass evidence.
- docs/polish/correction/balloon-completion.md — this report.

## Size, density and preserved visual language

Count increases from 16 to 25: 5 smaller/background balloons, 17 medium balloons, and 3 larger foreground balloons. The mean world-space diameter is 19.8% smaller at 375×812 and 33.9% smaller at 1280×900, compared with the previous pose function. The underlying latex shader, palette, neck, curved string and geometry are unchanged.

The approved timing stays exactly the same: covered scene switch at 1450ms; overlap through 2050ms; complete upward exit at 3600ms. The existing progress-driven integration and finale choreography are untouched.

## Performance changes and tradeoffs

Seven palette templates supply geometry and materials to 25 cloned groups. This reduces unique geometry allocations from 64 in the previous 16-balloon veil to 28, and unique materials from 48 to 21. Shared resources are disposed exactly once. Twenty-five pose objects are allocated once and reused, eliminating per-balloon pose allocation each frame. A stationary scrub does not redraw unchanged content; resize marks it dirty. Hidden documents skip rendering. Shader programs are compiled before the animation clock begins. Viewport dimensions are read on resize, not per frame. No extra React state updates, blur filters, shadows, or DOM balloon nodes were introduced.

The denser composition does contain more mesh instances and draw calls. Resource reuse reduces CPU allocation and setup work, but it does not prove faster GPU rendering. No physical-device or before/after frame-time profile was collected, so improved device frame pacing is not claimed as measured.

## Validation

- Production build: PASS, all five stages and routes completed. Existing large-chunk and plugin-timing warnings remain.
- TypeScript no-emit: PASS.
- Focused ESLint on all three balloon files and both completion test files: PASS.
- Balloon geometry test: PASS. A 31×31 raycast grid reports 100% silhouette coverage at 1450, 1750 and 2050ms for 320×740, 375×812, 1280×900 and 1536×726. This exceeds the 98–99% coverage target; the unchanged translucent shader does not create an opaque blackout.
- Monotonic upward movement and complete string exit: PASS.
- Shared geometry/material identity, single disposal, pose identity and timing constants: PASS.
- Existing scene-progress tests: PASS.
- Actual scene-scroll listener harness: PASS for accidental movement, light/fast/backward gestures, reversible progress, one-scene bounds, controls, focus, wheel, cancellation and cleanup.
- During the interrupted session, this same balloon implementation was visually checked in the active localhost preview: desktop Birthday → Little Moments, mobile final balloon transition, complete finale endpoint, and existing narrow/desktop scrolling. No black frame was observed in those checks.
- Fresh browser verification during this resumption was unavailable: the browser runtime failed during Windows sandbox setup on repeated attempts. Command validation succeeded through the approved local fallback. Previous visual checks are identified as previous checks, not represented as a new run.

## Remaining verification limits

No known type, build, focused-lint or tested transition-logic failure remains. Comparative frame pacing on a physical mobile device and a fresh browser replay after resumption remain unverified. Full-project lint was not rerun or repaired because it includes unrelated existing findings and cached browser extensions. No admin/auth/database tests that write fixtures were run. Nothing was pushed, merged or deployed.
