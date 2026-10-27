# Calculators (`assets/calculators.js`)
- Built only on the wiki mirror: `wiki/game-data.json` is fetched when the Calculators section first opens (precached by the service worker). Every number shown is wiki data, arithmetic on it, or an input the player sets; never a hand-typed game fact.
- Recipe planner: expands crafting and cooking recipes (not refining, which is a way to obtain raw materials) down to items with no such recipe. Skips self-multiplying recipes, guards against cycles, rounds up to whole batches for multi-output crafts, and lets the player cycle alternative recipes per item. Values are the wiki's base values.
- Harmonic Camp registers are plain arithmetic (`safeMathEval` in `index.html`).
