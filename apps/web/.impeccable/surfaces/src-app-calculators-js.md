---
version: 1
slug: "src-app-calculators-js"
primary_target: "src/app/calculators.js"
related_targets: ["src/ui/calculators/Calculators.tsx"]
---

# Calculators (recipe planner first)

Scope: the Calculators screen of the main app (`#calculators`), moving to React in `src/ui/calculators/`. Mode: Operate. Phone first, mid-session, glanced at beside the PC.

Jobs (all confirmed): shopping list of raw materials; craft along in order, ticking off; compare alternative recipes; check whether a craft is worth it. Constraints: every number is wiki data, arithmetic on it, or a labelled player input (docs/calculators.md). Base value, mineral extractors and Harmonic Camp registers stay, restyled within the same world.

## Direction contract
THESIS: The plan reads the way the craft is built, upward. Raw stock sits in a cargo hold at the bottom, each round of crafts stacks above it, and the product crowns the column. It refuses the indented dependency tree, where the same intermediate repeats at five depths and the order you craft in is invisible.
OWN-WORLD: The incumbent ATLAS HUD: slate-950 ground, hud-card panels, Orbitron for the capstone and round labels, JetBrains Mono tabular quantities, cyan for amounts, emerald for done/ready. New vocabulary: NMS-style inventory-slot tiles (square, hairline frame, amount in mono at the bottom-right corner) for raw stock; round bands joined by a thin vertical spine; the capstone as the one lit element.
STORY: The player sees at once what the product is worth against its inputs, scrolls to the hold, ticks off stock as they gather it, and watches each round light up as its inputs are covered, crafting upward until the capstone lights.
FIRST VIEWPORT: Sticky picker (item, quantity, presets). Below it, the capstone card: ×100 Stasis Device, worth versus raw inputs, steps count, and a large "Start at the cargo hold ↓" jump. Rounds then descend in reverse (last round first), each a band of step rows: output ×qty ← input chips, alternative-recipe switch, tick.
FORM: "Build it upward", a grounded structure, 4th on the re-rolled ordered list; seed key e943a213.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
