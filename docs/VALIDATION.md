# Validation record

## Passed

- TypeScript: `tsc --noEmit`.
- Production build: all five Vinext stages; nine routes including public invitation, admin, preview and API routes.
- Server rendering: `/`, authenticated `/admin`, and authenticated `/preview` returned HTTP 200 and their expected content. Anonymous `/admin` redirects to sign-in.
- Eleven automated backend integration checks: unauthenticated admin denied; cross-origin writes denied; invalid content rejected; draft isolation; stale revision conflicts; publishing programme/bhajans/feature visibility; unsafe upload rejection; object storage and unpublished media privacy; published media with HTTP range streaming; idempotent RSVP insertion and aggregate counts; closed RSVP enforced on the server.
- Mobile visual inspection at 390 × 844: opening, Ganesh Ji sequence, Darbar, flower offering, ceremonial deck. Lighting the diya, chapter advancement and offering feedback were exercised.
- Original devotional and card artwork inspected, converted to WebP and saved locally. Devanagari fonts are self-hosted.

## Limits of verification

- The browser tool later blocked preview access with its URL policy. Final visual revisions, remaining scenes and the CMS have compilation/server validation, but were not all visually tested in that browser or on physical phones.
- WebMCP chapter navigation registration was observed; direct invocation validation was unavailable.
- No live hosted deployment could be verified: the source-save/deployment workflow was rejected by automatic approval review. The existing Site registration and runtime admin configuration are preserved.
- Final family photos, recordings and unconfirmed times are intentionally still placeholders.

The integration script is restricted to loopback development origins. Its QA guest records are not production data, and no test database or local sign-in credential is included in the source archive.
