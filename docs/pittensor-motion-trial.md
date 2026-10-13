# Left Pittz motion trial

The preview-only trial uses 36 complete character drawings, in a 6 × 6 WebP atlas. The right worker retains its twelve-pose animation. The scene button toggles the left worker between original and trial motion, so approval can be based on an in-scene comparison. No separate arm rig is used.

The image is decoded before it becomes visible. Until then, or if loading fails, the original worker remains visible. CSS steps advance complete frames without React updates or crossfading. Normal cadence remains 2.8 seconds, with a 2.4-second fire-preview cadence. Reduced motion displays a single static frame.

Asset: `public/images/bonez-burn/left-thirty-six-v1.webp`.

Export validation: 36 distinct images; 1536 × 1536 pixels; 662,494 bytes transferred; 9,437,184 bytes decoded; every tile has transparent margins. Thirty-four new whole-character drawings and two intact original return key poses form the candidate loop. The original poses were retained where generation cropped two blade tips. Generated character details can vary slightly between drawings; this is a visual trial, not a promise of animator-authored frame consistency.

## Generation method and prompt set

Built-in image generation, with the original left-twelve-0, left-twelve-4, and left-twelve-8 images as identity and pose references. Dense 36-cell outputs were rejected because frames crossed their boundaries. The accepted source used three twelve-pose sheets with four columns and three rows.

Shared prompt: identity-preserving production sprites; preserve the original friendly grungy red/pink tiger-striped CryptoPittz with red mohawk, green glowing eyes, blue nose, green furry chest, pink belly, claws and tail. Complete gold shovel and wooden handle held by both paws. Full body in every frame, no detached limbs, no arm rig, no text/scenery/gridlines. Fixed scale and planted feet, generous transparent gutters, unchanged face proportions. Draw genuine small movement increments.

Batch 1: frames 1–12, empty blade low at shin height, gradual scoop, bones fill the blade, then lift the loaded shovel toward waist height.

Batch 2: frames 13–24, carry the loaded blade forward at waist height, progressively tip it outward/down, empty the blade, and begin lowering it. No falling bones outside the shovel; the scene renders the release.

Batch 3: frames 25–36, lower the empty shovel while leaning forward, gradually return to the starting scoop position. Final pose nearly matches the first.

Only the exported atlas is consumed by the site. Working generation sheets and rejected variants are not bundled. Image extraction preserves complete connected characters, registers the left foot and baseline, scales them into padded 256-pixel tiles, and encodes WebP at quality 82. The two retained originals replace clipped source drawings rather than inventing or duplicating frames.
