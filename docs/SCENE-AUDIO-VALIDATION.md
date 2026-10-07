# Scroll journey and chapter audio — validation, 5 October 2026

Implemented in the existing project; no card artwork or typography redesign.

## Navigation and visual refinements
- Native vertical scroll container with scene snap points, gentle settling, gesture-speed-dependent cinematic timing, keyboard PageUp/PageDown/arrow/Home/End navigation and secondary chapter shortcuts.
- Horizontal card gestures stay inside the deck. Returning during a shuffle cancels its timers and restores a usable stack. The visible transition-stop/skip button and public volume slider are removed.
- Distinct, related chapter atmospheres, curated CMS card themes and automatic cycling for new cards/programme entries. Existing cards retain their category colours. Photo press adds a restrained lift.
- Existing layered Darbar and balloon interactions retained. Only one WebGL world is mounted; background-only worlds render at reduced frequency. Hidden documents pause rendering. Reduced-motion paths bypass cinematic transitions and use immediate card settling.

## Audio and CMS
- Nine optional chapter soundtracks, enable/disable, continuation, base volume, and 0.25–8 second crossfade controls under Admin → Bhajans & sound → Chapter soundtracks.
- Uses the existing secure upload, storage and draft/publish workflow. Published scene audio is included in media access checks. No privileged credentials are exposed.
- Legacy Jagran/birthday recordings remain compatible. Final blessings is independently configured and intentionally silent by default; it never implicitly falls back to opening music.
- Continuation follows the intended chapter chain even after direct jumps or backward scrolling. Directly preceding selected bhajans can continue where configured.
- One Web Audio director owns at most two media voices during a crossfade, caches playback positions, cancels stale transitions and cleans up retired media. Sound preference persists through chapter navigation and the tab session. No media starts before a user gesture.
- Bell mixing lowers background gain to 18%, holds for resonance, then restores it over 3.4 seconds. Darbar-to-birthday uses music gain/filter automation and changes soundtrack under visual light occlusion.
- Current audio loads on demand. Only the upcoming birthday track's metadata is prepared when that transition begins; unused preparation is cancelled.

## Passed verification
- TypeScript and production build.
- Scene audio tests: gesture gate; same-file reuse; position resume; next-track metadata reuse; rapid navigation with no more than two voices; bell envelope; filter recovery; mute/navigation race; silent closing; disposal; backward/jump inheritance; settings validation.
- Scene CMS tests: draft isolation, per-scene audio/theme persistence, publication and invalid volume/URL rejection. Original draft and publication restored with revision checks.
- Existing API suite: 11 checks passed. Existing media suite: all six groups passed, including 6.73 MB multipart upload, retry, validation, private storage and range playback.
- Actual admin browser: uploaded the 6.73 MB silent MP3 fixture into Final blessings, observed upload progress/completion and the resulting storage reference; changed base volume/crossfade. Test edits were discarded, not published. Unreferenced test uploads remain private development storage.
- Actual CMS theme controls: consecutive new cards received charcoal and bronze, then manual selection changed the latter to olive. Test edits discarded.
- Actual mobile viewport approximately 393×852: scrolled forward through chapters and backward; verified settling to viewport boundaries, deck flip/swipe/gather, no horizontal page overflow, and no main volume slider or transition-stop button. Shuffle cancellation was observed from `gather` back to `stacked`.
- Actual media elements: birthday recording reached readyState 4 and played; Little Moments kept the same recording with increasing playback time; final blessings had no active audio; returning to venue restored birthday music.
- Desktop viewport 1280×900 and keyboard navigation checked.

## Limits
Browser viewport/pointer tests do not replace testing on a physical WhatsApp phone or a hardware trackpad. Reduced-motion behavior was reviewed in code; this browser control does not expose a preference-emulation switch. Bell gain/filter envelopes are verified with the audio-director tests, not a subjective listening evaluation. Existing 2.5D deity artwork remains in the 3D environment.

Production publishing remains pending the previously requested repository credential/push approval. Local implementation and build are complete.
