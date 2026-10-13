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

## Remaining game material pass

Pinball gains an illustrated portrait playfield, chrome bumper rings/glints, metallic flippers with colored inlays, and a dimensional chrome ball beneath the retained Bonez emblem. Only five renderer drawing statements and a helper import change in the compiled game bundle. A checksum boundary test reconstructs the prior bundle from those exact drawing changes and checks that everything else matches; the physics, collision geometry, outcomes, controls, and scoring remain the prior implementation. Background loading is lazy and falls back to the existing gradient while unavailable.

Crash gains an illustrated deep city backdrop, quieter procedural foreground buildings, reflective native-SVG hull material, exhaust glow, and a shaded multiplier readout. Beat gains a rooftop-deck pattern under its existing four lanes. Slot reels gain brass housings; roulette and Pittz21 gain felt, gold trim, and polished surrounds; Memory gains patterned card backs and engraved fronts; Rush uses the city scenery with clearer item shadows.

The new native SVG materials attach once per mounted game. Note positions, timing, game state, pilot images, multiplayer/wallet-related behavior, and game currencies are not replaced by artwork. The visual CSS is scoped by game class, including compact mobile frames.

Built-in image generation produced three decorative backgrounds, exported to WebP quality83:

- `public/images/playground/pinball-backplate.webp`: 840×1400;209,422 bytes. Prompt: blank premium portrait pinball playfield with etched dark indigo cyberpunk architecture, restrained gold engraving, chrome bevels, violet/cyan edge lights. Dark readable center. No bumpers, flippers, rails, balls, scoring labels, words or UI; live geometry is rendered by the game.
- `public/images/playground/crash-city.webp`: 1400×788;190,532 bytes. Prompt: panoramic illustrated layered violet/cyan/magenta cyberpunk skyline, gold accents, low skyways, atmospheric moon and distant traffic. Dark central sky for the live multiplier; no hero spacecraft, characters, lettering or UI.
- `public/images/playground/beat-rooftop.webp`:800×880;107,146 bytes. Prompt: portrait rooftop DJ backdrop with night skyline, neon roof strips, dark metallic deck, turntables at lower corners and gold hardware. Empty restrained center for live rhythm lanes; no notes, lanes, timing rings, text, characters or UI.

Live visual verification remains limited by the preview's team sign-in protection. Review each game in the authorized preview before production release.
