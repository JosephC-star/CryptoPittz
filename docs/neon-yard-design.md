# Pittz Playground — The Neon Yard

This redesign shares the Pittensor preview branch and Netlify deploy preview. It does not register a ChatGPT Site or use Sites hosting.

## Scope

The homepage entrance uses the borderless artwork-to-copy layout of the Financial District and Pittensor. The dedicated Playground gains an illustrated courtyard hero, Plinko feature link, nine illustrated cabinet screens, accessible category filters, a compact Vibe Mode treatment, brass-accented trophies, and a matching Bonez Vault surround.

The hero is hidden while playing. Filters reset on return to the lobby. The existing bundled game JavaScript, nine routes, wallet bridge, storage keys, scoring, trophies, music implementation, and game controls are retained. Gameplay panels retain their layouts. New presentation is scoped to the lobby, shared surrounds, and trophy drawer.

Mobile stacks cabinet cards and places hero text below the art. Reduced motion disables new glints and card movement.

## Assets and generation

Built-in image-generation tool. Hero: `public/images/playground/neon-yard.webp` (423,708 bytes). Nine game-card images in that directory: `neon-rush.webp`, `neon-palace.webp`, `neon-match.webp`, `neon-twentyone.webp`, `neon-roulette.webp`, `neon-plinko.webp`, `neon-pinball.webp`, `neon-crash.webp`, and `neon-beat.webp`. Total artwork approximately 947 KB. Original generation sheets are not bundled.

Hero prompt: cinematic illustrated cyberpunk courtyard with dog-house-shaped arcade booths, violet/cyan/hot pink neon, wet concrete reflections, gold accents, pinball, peg games, rooftop DJ corner, and trophy case. Preserve the supplied red mohawk and golden holographic-cap CryptoPittz identities as relaxed hangout mascots on the right. Leave the left darker for a live HTML headline. Rich architectural materials, no readable lettering or UI. The original two-worker sprite sheet is an identity reference only; no shovels or furnace.

Cabinet prompt: exact three-column/three-row illustrated contact sheet with nine unique scenes in the same palette. Bonez in a tunnel; gold pitbull-and-bone slot reels; paired portrait cards; portrait blackjack cards and bone chips; gold roulette wheel; cyan bone ball among magenta pegs; neon pinball bumpers; hovercraft over a night city; rooftop turntables and four beat lanes. No typography or UI. Panels exported individually to WebP at quality 85.

## Checks

JavaScript syntax; homepage and stylesheet compilation; category selection, hero visibility for every game route, and filter reset tests. Live browser testing remains limited by the Netlify preview's team sign-in protection. Review responsive appearance and live interactions in an authorized browser before production release.

## Plinko material pass

The game gains a recessed navy glass backplate with beveled gold/chrome framing and cyan/magenta edge lighting, metallic pegs, illuminated launch ports, dimensional payout pockets, a chrome orb behind the original Bonez emblem, and refined trails and impact glow. Board coordinates, path animation, drop resolution, odds, payouts, storage, and scoring are retained in the unmodified game bundle.

The separate `plinko-skin.js` appends four cosmetic SVG gradients once per board; `plinko-skin.css` styles existing shapes. The backplate asset is `public/images/playground/plinko-backplate.webp`, 71,522 bytes. Built-in image-generation prompt: empty premium illustrated Plinko backplate, almost-square landscape; dark navy glass center with faint diamond-grid texture, brushed black metal, chrome/gold bevels, screws, cyan/magenta outer LED rails and bottom tray. No pegs, ball, numbers, words, characters, or fake gameplay geometry. Real game objects remain rendered by the existing SVG. Exported at a maximum 1200-pixel edge, WebP quality 83.

Material idempotency and preservation of original SVG definitions are checked in `tests/plinko-skin.test.mjs`. Live appearance and play still need review in an authorized Netlify preview browser.
