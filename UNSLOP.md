# UI audit (unslop) — for owner approval, nothing in the UI was changed

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
