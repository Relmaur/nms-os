# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
One player (the owner), on a phone propped beside the PC while playing No Man's Sky, glancing at the app mid-session between in-game actions. Others may open the public link, but the app is built for this player's own play. Installed as a PWA; must work offline.

## Product Purpose
ATLAS // MASTER OS is a local-first No Man's Sky companion: a log of visited systems, an Outlaw Run planner for Suspicious Packet loops, calculators over a verified wiki mirror, a Codex of wiki articles, and a six-book personal guide. Success is answering an in-game question in a glance and a tap, without alt-tabbing or losing place in the game.

## Positioning
Every game fact comes from a verified mirror of the No Man's Sky wiki (`wiki/game-data.json`), never hand-typed and never community-crafted data; anything the wiki can't know is a labelled player input. User data never leaves the device except by explicit Export.

## Operating Context
- Mid-session use: one hand, short glances, the game's own crafting/refiner menus open on the PC.
- The recipe planner serves four jobs, all confirmed: a shopping list of raw materials to farm or buy before starting; crafting along, following the steps in order and ticking off what's done; comparing alternative recipes before committing; checking whether a craft is worth it (value versus inputs).
- Offline after one online visit (service worker precache).

## Capabilities and Constraints
- Static PWA on GitHub Pages under `/nms-os/`; React + TypeScript + Vite; Tailwind compiled at build time; no CDNs at run time (docs/architecture.md, ADR-0004).
- Calculators may only show wiki data, arithmetic on it, or player inputs (docs/calculators.md). The planner expands crafting and cooking recipes to items with no such recipe, rounds up multi-output crafts to whole batches, and lets the player switch alternative recipes per item.
- Saved state shape is a compatibility contract (docs/state-schema.md); changes are additive.
- Session mode (3.9.0): a session bar with a recap, and timers saved in the log. A refiner's time is the wiki's refining time; a crop's or a custom timer's is the player's input. Alerts are local (toast, vibration, a service-worker notification) and arrive while the browser runs the app; there is no push server.
- Planner ticks persist on this device only (owner's decision, 2026-10-27): not in `nms_state.json` or exports.

## Brand Commitments
Name "ATLAS // MASTER OS" with the planet mark; the existing dark HUD look (Orbitron display, Inter body, JetBrains Mono numbers; emerald and cyan accents) is the incumbent visual authority.

## Evidence on Hand
- Wiki mirror: `wiki/` (about 3,160 verified articles) and `wiki/game-data.json` (recipes, values).
- The player's own state file: `apps/web/public/nms_state.json` (fleet, phase, checklists).
- No testimonials, users or metrics beyond the owner; none may be invented.

## Product Principles
1. Glanceable mid-session: the answer comes first, detail on demand.
2. Truth from the wiki only; label every player-supplied number.
3. Local-first and offline: nothing leaves the device unasked.
4. Never lose the player's data or place.

## Accessibility & Inclusion
Phone-first touch targets and readable sizes at arm's length; screens moved to React are axe-gated (no violations) in `pnpm check`.
