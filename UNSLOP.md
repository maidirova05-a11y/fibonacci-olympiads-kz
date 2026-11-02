# UI audit (unslop) — approved and applied (polish mode)

Verdict: light to moderate, close to polish mode. I did not touch visuals overnight because I could not check the result in a browser; the fixes below are small and safe to approve as a batch.
Counts are from `index.html` (inline CSS). No emoji in the interface, no `transition: all`, one gradient-text use.

## Signs found
- Type: 86 declarations with font-weight 700–900 (Roboto Slab headings); 12 uppercase labels; 3 negative letter-spacings (confirm display text only).
- Motion: 7 `infinite` animations — shimmer on `.cta-main::after` and `.fc-btn::after`, pulsing WhatsApp button (`waPulse`, twice), play-button pulse. Marquee and scroll cue are acceptable.
- Gradients: 4 `linear-gradient`, 2 `radial-gradient`; `.fill` gradient text is the reveal effect for the intro, keep or replace with a plain color transition.

## Proposed direction (to approve)
- Product: international mathematics olympiad for grades 3–11 in Kazakhstan, run by AZ GROUP.
- Character: exact, calm, a little playful.
- World: graph paper, spirals and the Fibonacci sequence; the red accent stays as the single accent.
- Signature: the spiral mark used only as section marker.

## Plan if approved
1. Weights to 400/500/600, sizes from a scale. 2. Sentence-case labels. 3. Remove shimmer and pulse loops. 4. Check 4px spacing rhythm in the fee/calculator block. 5. Keep layout, copy and order unchanged.

## Done (polish mode, brand kept)
Only the inline CSS of `index.html` changed; copy, SEO, API, prices/dates, tracking IDs, markup and JS are untouched. No asset hashes needed bumping (no .js/.css file changed).
- Type: all 700/800/900 weights became 600 (Roboto Slab headings, numerals, buttons, Manrope labels). The font-face blocks now declare one variable-weight range per subset (same woff2 files, fewer rules) so 600 renders exactly. Preloads unchanged.
- Labels: all 12 `text-transform:uppercase` removed (sentence case), wide tracking (.1-.3em) reduced to .02em (.12em for the digit sequence). Display headings keep their slight negative tracking.
- Motion: removed the shimmer on `.cta-main` and `.fc-btn`, the WhatsApp/lead pulse and the play-button pulse. Remaining infinite loops: marquee and scroll cue.
- Shadows: red and green colored glows on buttons/FABs became neutral soft shadows. The red offset "stamp" shadows on the video frame stay (brand device).
- Kept on purpose: hero radial (neutral white to paper tone), scrims over photos, `.fill` gradient text (the intro reveal, driven by JS), spiral/number hero, red as the only accent, layout and section order.
- Not done: 4px spacing audit of the fee/calculator block (values left as is), `oferta.html` and `polozhenie.html` have their own CSS and were not touched.
- Checked with Playwright at 360x740 and 1440x900, with and without JS: no page errors, hero visible without JS, no horizontal overflow at 360px (desktop has a pre-existing 1px).
