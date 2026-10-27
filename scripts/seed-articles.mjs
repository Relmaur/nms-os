// Curated starter pack written to wiki/ by `sync-wiki.mjs` so the Codex works fully offline
// before any network harvest. Harvested pages with the same title are saved alongside as <slug>_wiki.md.
export const SEED_ARTICLES = [
  {
    title: 'Anomalous Doughnut',
    folder: 'cooking',
    summary: 'Endgame culinary item. When fed into the Exosuit Nutrient Ingestor, grants +6,443% Fauna Analysis Rewards (10M–33M Units per creature scan).',
    body: `## Overview
**Anomalous Doughnut** is a high-tier edible product crafted in the **Nutrient Processor**.

## Nutrient Ingestor Meta Buff
- **Effect:** +6,443% Fauna Analysis Rewards for 10 minutes per doughnut.
- **Execution:** Do NOT eat from Cargo. Load into the Exosuit **Nutrient Ingestor** tech slot and click *Begin Ingestion*.

## Complete Recipe Tree
1. \`Frost Crystal\` → \`Glass Grains\` → **Refined Flour**
2. \`Faecium\` → **Wild Yeast**
3. \`Refined Flour\` + \`Wild Yeast\` → **Dough**
4. \`Fresh Milk\` → \`Cream\` → \`Churned Butter\` → **Clarified Oil**
5. \`Cactus Flesh\` → \`Cactus Nectar\` → **Processed Sugar**
6. \`Dough\` + \`Clarified Oil\` + \`Processed Sugar\` → **Lumpy Doughnut**
7. \`Hexaberry\` + \`Processed Sugar\` → **Anomalous Jam**
8. \`Lumpy Doughnut\` + \`Anomalous Jam\` → **Anomalous Doughnut**

See also: [[Nutrient Ingestor]] · Calculator *Anomalous Doughnut Batch Planner*.`
  },
  {
    title: 'Refiner Alchemy & Oxygen Multiplication',
    folder: 'guides',
    summary: 'Complete Medium & Large Refiner expansion loops using an Oxygen Gas Hotspot to multiply Carbon, Sodium, Cobalt, Ferrite, and Chlorine.',
    body: `## Oxygen Multiplication Loops
Connect an **Oxygen Gas Hotspot** to your base refiners to multiply core survival materials infinitely:

| Output Material | Refiner Formula | Expansion Ratio |
| :--- | :--- | :--- |
| **Condensed Carbon** | 1 Condensed Carbon + 2 Oxygen | **1 → 6** |
| **Sodium Nitrate** | 1 Sodium Nitrate + 1 Oxygen | **1 → 2** |
| **Ionised Cobalt** | 1 Ionised Cobalt + 2 Oxygen | **1 → 6** |
| **Faecium (Wild Yeast)** | 1 Faecium + 1 Oxygen | **1 → 3** |
| **Magnetised Ferrite** | 1 Pure Ferrite + 1 Oxygen | **1 → 2** |
| **Chlorine** | 1 Chlorine + 2 Oxygen | **1 → 6** |

## Nanite Refining Ratios
- **Runaway Mould:** 5 Runaway Mould → 1 Nanite Cluster (9,999 stack = 1,999 Nanites)
- **Radiant Shard:** 1 Radiant Shard → 50 Nanites
- **Inverted Mirror:** 1 Inverted Mirror → 95 Nanites
- **Hyaline Brain:** 1 Hyaline Brain → 230 Nanites
- **Tainted Metal:** 1 Tainted Metal → 2 Nanites`
  },
  {
    title: 'Stasis Device',
    folder: 'products',
    summary: 'Highest-tier crafted trade commodity worth 15,600,000 Units each (312M Units per stack of 20). Crafted from Quantum Processor, Cryogenic Chamber, and Iridesite.',
    body: `## Overview
**Stasis Device** is an endgame crafted product valued at **15,600,000 Units** each.

## Master Assembly Formula
\`Quantum Processor\` + \`Cryogenic Chamber\` + \`Iridesite\` = **Stasis Device**

- **Quantum Processor** = Circuit Board + Superconductor
- **Cryogenic Chamber** = Living Glass + Cryo-Pump
- **Iridesite** = Aronium + Magno-Gold + Grantine

## Raw Ingredients (Per 1 Stasis Device / Per Batch of 20)
- **Radon:** 400 (8,000 for 20)
- **Sulphurine:** 400 (8,000 for 20)
- **Nitrogen:** 400 (8,000 for 20)
- **Frost Crystal:** 400 (8,000 for 20)
- **Star Bulb:** 200 (4,000 for 20)
- **Solanium:** 200 (4,000 for 20)
- **Gamma Root:** 200 (4,000 for 20)
- **Cactus Flesh:** 100 (2,000 for 20)
- **Faecium:** 50 (1,000 for 20)`
  },
  {
    title: 'Hyaline Brain & Sentinel Interceptor Salvage',
    folder: 'technology',
    summary: 'Core pilot interface extracted from crashed Sentinel Interceptors. Probes an Ancient Monolith to convert into a Harmonic Brain.',
    body: `## Overview
Extracted from crashed **Sentinel Interceptors** on Dissonant planets.

## Troubleshooting: When "Probe Subconscious" Does Nothing
1. **Hold 3x Radiant Shards + 1x Inverted Mirror (#1 Rule):** The Hyaline Brain will silently refuse to mark an Ancient Monolith unless you currently carry at least **3 Radiant Shards** and **1 Inverted Mirror** in your inventory.
2. **Pin the Broken Brain Slot:** Click directly on the damaged *Harmonic Brain* slot inside the crashed ship's inventory.
3. **Active Log Check:** Highlight the *Salvage Site* mission in \`Pause -> Log\` (abandon duplicate salvage quests if you triggered multiple spikes).`
  },
  {
    title: 'Infra-Knife Accelerator',
    folder: 'technology',
    summary: "Highest DPS starship weapon in No Man's Sky. When placed in Ythgall's 3-in-a-row Supercharged bar (R2C2-R2C4) with a Q-Resonator, exceeds 90,000+ DPS.",
    body: `## Overview
Rapid-fire plasma gatling cannon for starships.

## Optimal Wiring for Flagship Ythgall
- **Row 2, Col 3 (SC Slot #2):** Main Infra-Knife Accelerator
- **Row 2, Col 2 (SC Slot #1):** S/X-Class Infra-Knife Upgrade #1
- **Row 2, Col 4 (SC Slot #3):** S/X-Class Infra-Knife Upgrade #2
- **Row 1, Col 3:** Q-Resonator Blueprint (+1 Cannon Barrel)
- **Row 1, Cols 2 & 4:** S/X-Class Infra-Knife Upgrade #3`
  },
  {
    title: 'Optical Drill',
    folder: 'technology',
    summary: 'Multi-Tool Mining Beam blueprint that grants +50% base resource yield (+88% when placed inside a Supercharged Slot like Light Capacitor R2C4).',
    body: `## Overview
Multi-Tool blueprint unlocked at the Space Anomaly.

## Supercharged Yield Trick (+88% Resources)
Placing the **Optical Drill** directly inside a **Supercharged Slot** (such as \`Row 2, Col 4\` on **Light Capacitor 3-93F/33Q**) boosts its resource multiplier from +50% to **+88%**—nearly doubling your harvest of **Runaway Mould**, **Radiant Shards**, and **Biodome crops**!`
  },
  {
    title: 'Oxygen',
    folder: 'resources',
    summary: 'Common red atmospheric gas harvested from oxygen-bearing flora and Kelp Sacs. Recharges Life Support and is the catalyst behind every Oxygen-hotspot refiner multiplication loop.',
    body: `## Overview
**Oxygen** is a common gas resource (base value ~34 Units) and one of the most important catalysts in the game.

## Where to Get It
- **Red-leafed plants** on almost every planet — hit them with the Mining Beam.
- **Kelp Sacs** underwater (refine 1 Kelp Sac → 1 Oxygen).
- **Oxygen Gas Hotspots** — find with the Survey Device and place a Gas Extractor for a passive, infinite supply.

## Key Uses
- Recharges **Life Support** in the Exosuit.
- Catalyst for the base refiner multiplication loops — see [[Refiner Alchemy & Oxygen Multiplication]].
- Anchor resource for the Book IV "Golden Triangle" self-sufficient base.`
  },
  {
    title: 'Condensed Carbon',
    folder: 'resources',
    summary: 'Refined, denser form of Carbon (2 Carbon → 1 Condensed Carbon). Recharges tech more efficiently and multiplies 1 → 6 with Oxygen in a refiner.',
    body: `## Overview
**Condensed Carbon** is the refined form of Carbon and recharges technology roughly twice as efficiently per unit.

## Refining
| Input | Output |
| :--- | :--- |
| 2 Carbon | 1 Condensed Carbon |
| 1 Condensed Carbon + 2 Oxygen | 6 Condensed Carbon (Oxygen loop) |

## Tips
- Pack a full 9,999 stack for Expedition care packages (Book V).
- Run it through the Oxygen loop at your base to keep an endless supply — see [[Refiner Alchemy & Oxygen Multiplication]].`
  },
  {
    title: 'Radiant Shard',
    folder: 'resources',
    summary: 'Sentinel-derived salvage from Dissonant systems. Carry 3 to make the Hyaline Brain probe work; refines into ~50 Nanites each.',
    body: `## Overview
**Radiant Shards** come from Corrupted Sentinel activity in **Dissonant systems** and from salvaging Sentinel Interceptors.

## Why You Need Them
- **Hyaline Brain probe rule:** You must hold at least **3 Radiant Shards + 1 Inverted Mirror** or "Probe Subconscious" silently fails — see [[Hyaline Brain & Sentinel Interceptor Salvage]].
- Used while repairing crashed Sentinel Interceptors.

## Value
- Refiner: 1 Radiant Shard → ~50 Nanites.
- The Salvage calculator assumes **3 Radiant Shards + 1 Inverted Mirror per ship**.`
  },
  {
    title: 'Inverted Mirror',
    folder: 'resources',
    summary: 'Dropped by most Dissonance Resonators (~80%) in Dissonant systems. Required alongside 3 Radiant Shards for the Hyaline Brain probe; refines into ~95 Nanites.',
    body: `## Overview
**Inverted Mirrors** drop from **Dissonance Resonators** — roughly 80% of them; the other ~20% drop an **Echo Locator**.

## The "On-Foot Peek" Trick
Land, walk up to the resonator with your weapon holstered (Corrupted Sentinels ignore you until you fire) and read its HUD label. Only shoot the ones labelled **Echo Locator** when you need a new Harmonic Camp.

## Uses
- Hyaline Brain probe requirement (1x, plus 3 Radiant Shards).
- Refiner: 1 Inverted Mirror → ~95 Nanites.`
  },
  {
    title: 'Nutrient Ingestor',
    folder: 'technology',
    summary: 'Exosuit technology that consumes cooked food for timed buffs. Mandatory for the Anomalous Doughnut +6,443% Fauna Analysis scan-payout buff.',
    body: `## Overview
The **Nutrient Ingestor** is an Exosuit technology bought as a blueprint on the Space Anomaly (Book I roadmap, Hr 1–3).

## How to Use It
1. Install it in an Exosuit **tech** slot.
2. Move cooked food (e.g. Anomalous Doughnuts) into the Ingestor itself — not your cargo.
3. Click **Begin Ingestion**. Each doughnut grants a 10-minute buff.

## Why It Matters
Without the Ingestor, even an S-Class scanner (Light Capacitor) pays ~180k–450k Units per creature. With an active doughnut buff, scans pay **10M–33M Units** each.

See also: [[Anomalous Doughnut]].`
  },
  {
    title: 'Atlantid Drive',
    folder: 'technology',
    summary: 'Starship hyperdrive upgrade from In Stellar Multitudes that unlocks warps to Purple Star systems, Gas Giants and deep-ocean worlds.',
    body: `## Overview
The **Atlantid Drive** lets your starship warp to **Purple Star** systems, which host **Gas Giants** and deep-ocean planets.

## How to Unlock (Endgame Pillar 3)
1. Complete the **Atlas Path**.
2. Complete **They Who Returned** (Autophage).
3. Pulse in space to trigger **In Stellar Multitudes** and follow it to the Atlantid Drive blueprint.

## Ythgall Placement
Hyperdrive-family upgrades benefit from a Supercharged slot — candidate for Ythgall's 4th SC slot (R3C8 in Book III).`
  },
  {
    title: 'Supercharged Slot Mechanics',
    folder: 'guides',
    summary: 'How Supercharged slots spawn, why some inventories show zero, and how adjacency works — with the exact layouts for Ythgall and Light Capacitor.',
    body: `## The 3 Golden Rules
1. **Tied to class:** S = 4 slots, A = 3, B = 2, C = 1. Royal, Experimental and Sentinel tools never exceed 4; they have higher hidden base stats instead.
2. **Spawn area:** Supercharged slots spawn only within the first 40 grid coordinates (**Rows 1–4, Cols 1–10**). If those cells are locked (e.g. Defiance of Thought's starting 3×8 grid), the SC slots are hidden until you unlock them.
3. **Harmonic Camp cabinet lock:** Reloading a Save Beacon at the same camp never changes the cabinet's class.

## Adjacency
Same-technology modules sharing a **flat edge** gain an adjacency bonus. Diagonal neighbours do not count — which is why Aeron-ημ's diagonal SC pattern (R3C1, R2C2, R2C4, R1C5) is weak and Ythgall's horizontal bar is ideal.

## Your Layouts
| Item | Supercharged Slots | Best Use |
| :--- | :--- | :--- |
| Ythgall | R2C2, R2C3, R2C4 + R3C8 | Infra-Knife bar + hyperdrive/pulse |
| Light Capacitor 3-93F/33Q | R1C8, R2C4, R4C6 | Scanner cluster + Optical Drill |
| Defiance of Thought | Hidden in Cols 9–10 / Row 4 | Unlock with free Expansion Slots |`
  },
  {
    title: 'Harmonic Camps & Dissonant Systems',
    folder: 'guides',
    summary: 'Echo Locators, the register math puzzle, the 3–6 crash-site cycle per camp, and how to farm Sentinel Interceptors and Sentinel Multi-Tools.',
    body: `## Finding a Camp
Shoot a **Dissonance Resonator** that drops an **Echo Locator** (use the on-foot peek trick from [[Inverted Mirror]]) and use it to reveal a **Harmonic Camp**.

## The Register Puzzle
The terminal shows three arithmetic registers (e.g. \`6 - 2\`, \`2 + 8\`, \`11 + 5\`). Enter each result as glyphs — the *Harmonic Camp Override Solver* calculator does the math for you. Example solution: **4, 10, 16**.

## Farming Loop
- Drop a **Save Beacon** at the camp before solving.
- Each camp cycles through **3–6 crash sites** in its local radius; once sites repeat, use a new Echo Locator elsewhere on the planet.
- Reloading at the same camp never changes the Multi-Tool cabinet's class.

See also: [[Hyaline Brain & Sentinel Interceptor Salvage]].`
  },
  {
    title: 'Runaway Mould',
    folder: 'resources',
    summary: 'Collectible organic resource that refines into Nanite Clusters (5 → 1). A full 9,999 stack is the classic Expedition "Nanite seed".',
    body: `## Overview
**Runaway Mould** is gathered from mould growths on planet surfaces. Its main value is converting into Nanites.

## Refining
- 5 Runaway Mould → 1 Nanite Cluster
- 9,999 stack → ~1,999 Nanites

## Tips
- Put the **Optical Drill** in a Supercharged slot for up to +88% yield (see [[Optical Drill]]).
- Pack 2–3 stacks before an Expedition to afford cloning Ythgall and Defiance of Thought inside the event (Book V).`
  },
  {
    title: 'Outlaw Station Nanite Flip',
    folder: 'guides',
    summary: 'Convert Units into 25,000+ Nanites in ~15 minutes by buying Suspicious Packets from the Contraband Agent and selling the unpacked modules for Nanites.',
    body: `## Why It Works
Normal upgrade vendors only take Nanites. Outlaw Stations let you turn **Units** into Nanites via two vendors.

## The Loop
1. **Contraband Agent:** Spend Units (~75,000 U each) on every *Suspicious Packet (Tech)* and *Suspicious Packet (Arms)*.
2. **Unpack** every packet in your inventory into X-Class upgrade modules.
3. **Upgrade Merchant:** Open *Buy Upgrade Modules*, switch to the **SELL** tab and sell the modules for 300–500 Nanites each.

## Numbers
| Stations | Packets | Unit Cost | Nanite Yield |
| :--- | :--- | :--- | :--- |
| 1 | 15 | ~1.1M | ~5,250 |
| 5 | 75 | ~5.6M | ~26,250 |

Use the *Outlaw Station Nanite Flipper* calculator to plan bigger runs.`
  }
];
