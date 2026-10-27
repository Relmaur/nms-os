---
name: ATLAS // MASTER OS
description: A dark HUD companion for No Man's Sky, read at a glance on a phone beside the game.
colors:
  void: "#050811"
  hud-panel: "#0b1325"
  hud-panel-glass: "rgba(11, 19, 37, 0.85)"
  hud-edge: "rgba(56, 189, 248, 0.16)"
  slate-ground: "#0f172a"
  slate-deep: "#020617"
  hairline: "#1e293b"
  control-edge: "#334155"
  control-edge-hover: "#64748b"
  ink-bright: "#ffffff"
  ink: "#e2e8f0"
  ink-soft: "#cbd5e1"
  ink-muted: "#94a3b8"
  ink-label: "#8b9ab0"
  scanner-cyan: "#06b6d4"
  scanner-cyan-glow: "#22d3ee"
  scanner-cyan-pale: "#67e8f9"
  quantity-cyan: "#a5f3fc"
  ready-emerald: "#10b981"
  ready-emerald-lit: "#34d399"
  ready-emerald-pale: "#6ee7b7"
  ready-emerald-ink: "#022c22"
  units-amber: "#f59e0b"
  units-amber-pale: "#fde68a"
  units-amber-text: "#fcd34d"
  exotic-purple: "#a855f7"
  exotic-purple-pale: "#c084fc"
  outlaw-crimson: "#ef4444"
typography:
  display:
    fontFamily: "Orbitron, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
  capstone:
    fontFamily: "Orbitron, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Orbitron, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: "1.5rem"
  round-label:
    fontFamily: "Orbitron, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: "1.25rem"
    letterSpacing: "0.025em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  body-small:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.14em"
  numeric:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  seg: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
components:
  hud-card:
    backgroundColor: "{colors.hud-panel-glass}"
    rounded: "{rounded.xl}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.ready-emerald}"
    textColor: "{colors.slate-deep}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ready-emerald-lit}"
  button-secondary:
    backgroundColor: "{colors.slate-ground}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-jump:
    backgroundColor: "rgba(34, 211, 238, 0.1)"
    textColor: "#cffafe"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  field-input:
    backgroundColor: "{colors.slate-ground}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "40px"
  seg:
    backgroundColor: "{colors.slate-ground}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.seg}"
    padding: "0 12px"
    height: "36px"
  seg-on:
    backgroundColor: "rgba(16, 185, 129, 0.15)"
    textColor: "#d1fae5"
  tag-filter:
    backgroundColor: "{colors.slate-ground}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "30px"
  tag-filter-on:
    backgroundColor: "rgba(16, 185, 129, 0.15)"
    textColor: "#a7f3d0"
  tick-target:
    backgroundColor: "{colors.slate-deep}"
    textColor: "#475569"
    rounded: "{rounded.lg}"
    size: "44px"
  tick-target-ready:
    backgroundColor: "rgba(52, 211, 153, 0.1)"
    textColor: "{colors.ready-emerald-pale}"
  tick-target-done:
    backgroundColor: "{colors.ready-emerald-lit}"
    textColor: "{colors.ready-emerald-ink}"
  hold-slot:
    backgroundColor: "{colors.slate-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px"
  hold-slot-gathered:
    backgroundColor: "rgba(16, 185, 129, 0.1)"
    textColor: "{colors.ink-muted}"
  capstone:
    backgroundColor: "{colors.hud-panel}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.xl}"
    padding: "20px"
  capstone-lit:
    backgroundColor: "rgba(2, 44, 34, 0.4)"
  nav-item:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
    height: "44px"
  nav-item-active:
    backgroundColor: "rgba(6, 182, 212, 0.1)"
    textColor: "{colors.ink-bright}"
---

# Design System: ATLAS // MASTER OS

## Overview

**Creative North Star: "The Ship's Console"**

ATLAS is a starship's instrument panel brought to a phone propped beside the PC. A near-black void ground, washed with faint cyan and purple nebula light, carries translucent glass panels with a hairline cyan edge. Display type is Orbitron, used sparingly for screen titles, card titles, round labels and the planner's product; everything else is quiet Inter, and every quantity is JetBrains Mono with tabular figures, so numbers read like instrument readouts and line up column to column.

Density is moderate and glance-first: one answer per card, detail on demand, touch targets of at least 40px (44px for anything ticked mid-session). Colour is semantic rather than decorative. Cyan means an amount or the scanner's focus, emerald means done or ready, amber means Units (money), purple belongs to exotic and register content, crimson to the planet mark and outlaw status. The accent hues appear as tinted fills at 10-15% alpha with a 30-60% alpha border, almost never as solid blocks; the one solid fill is the emerald of a completed tick or the primary action.

The world's material is light on glass: depth comes from translucency, backdrop blur and soft coloured glow (a ready tick, a lit round node, the exotic slot, the capstone's bloom), never from hard or offset shadows.

**Key Characteristics:**
- Void ground (near-black blue) with three faint radial nebula washes, fixed to the page.
- Glass HUD cards: 85% opaque panel, 12px backdrop blur, hairline sky-blue edge, 16px corners.
- Orbitron for titles only; Inter for reading; JetBrains Mono tabular figures for every number.
- Semantic accents as tinted fills plus a stronger tinted border.
- Phosphor icons (bold weight by default) as the only icon set.
- Light-based depth: glow and blur, no offset shadows.

## Colors

A cold void palette lit by a few signal hues, each with a single meaning.

### Primary
- **Scanner Cyan** (scanner-cyan, with scanner-cyan-glow and scanner-cyan-pale): the instrument colour. Focus rings, selection, the `//` in the wordmark, the active nav item's tint and inset edge, the capstone's resting glow, links on hover. In its palest step (quantity-cyan) it is the colour of every amount: step quantities, recipe inputs, hold slot counts.

### Secondary
- **Ready Emerald** (ready-emerald, ready-emerald-lit, ready-emerald-pale): done, ready, on. Primary action buttons, selected segments and tags, switches, ticked steps and gathered slots, the planner spine as it fills, a round that can be crafted now, raw-material amounts in recipe lines. Text on solid emerald is ready-emerald-ink.

### Tertiary
- **Units Amber** (units-amber, units-amber-pale, units-amber-text): money and caution. Product worth and haul totals in Units, a recipe switch that costs more, the keep-awake chip when on, the "wait" outlaw pill.
- **Exotic Purple** (exotic-purple, exotic-purple-pale): exotic tech and register answers; the supercharged-slot tile.
- **Outlaw Crimson** (outlaw-crimson): the planet mark in the header and the outlaw tag. Never a general error colour on its own.

### Neutral
- **Void** (void): page ground, scrollbar track, tab-bar base, the ring around badges.
- **HUD Panel** (hud-panel, hud-panel-glass): card and grouped-list surfaces; the glass variant over blur.
- **HUD Edge** (hud-edge): the hairline sky-blue border of cards and grouped lists.
- **Slate Ground** (slate-ground): inputs, segments, chips, secondary buttons.
- **Slate Deep** (slate-deep): wells inside cards: tick targets at rest, the cargo hold, code blocks.
- **Hairline** (hairline): dividers, list separators, header and tab-bar edges.
- **Control Edge** (control-edge, control-edge-hover): borders of every control at rest and on hover.
- **Ink** (ink-bright, ink, ink-soft, ink-muted, ink-label): headings and names in white; body text; field labels and secondary body; captions and provenance lines; uppercase group labels.

Utility colours resolve through Tailwind's default palette (slate, cyan, emerald, amber, purple, red); the hex values above are the steps the system uses, and hand-authored CSS in `theme.css` uses the same hexes.

### Named Rules
**The One Meaning Rule.** Each accent hue carries one meaning: cyan is amount or focus, emerald is done or ready, amber is Units or caution. A new screen reuses the meaning, never the hue for decoration.

**The Tint-and-Edge Rule.** Accent states are a 10-15% alpha fill with a 30-70% alpha border of the same hue (an on segment, a ready band, a pill, the jump button). Solid accent fills are reserved for a completed tick and the primary action.

## Typography

**Display Font:** Orbitron (with sans-serif), weights 500, 700, 900 bundled
**Body Font:** Inter (with sans-serif), weights 300-700 bundled
**Label/Mono Font:** JetBrains Mono (with monospace), weights 400-600 bundled

**Character:** Orbitron's squared, wide letterforms give the console voice in short bursts; Inter keeps reading calm; JetBrains Mono turns every count and value into a readout. All three are self-hosted from npm, nothing loads from a font CDN.

### Hierarchy
- **Display** (Orbitron 700, 1.5rem / 2rem): screen titles (`Calculators`, `Systems`), the system name in Home's recent card.
- **Capstone** (Orbitron 700, 1.5rem rising to 1.875rem from 640px, line-height 1.25): the planner's product name, the largest type on the Calculators screen.
- **Title** (Orbitron 700, 1rem): card titles, always paired with a Phosphor bold icon in the card's semantic hue; the cargo hold title.
- **Round label** (Orbitron 700, 0.875rem, tracking 0.025em): "Round N" over each crafting band.
- **Body** (Inter 400, 0.875rem / 1.25rem): sentences, results, recipe lines (relaxed leading). Inputs render at 1rem below 640px so iOS does not zoom, 0.875rem above.
- **Body small** (Inter 400, 0.75rem / 1rem): field labels, captions, provenance and help lines, status text.
- **Label** (Inter 600, 11px, tracking 0.14em, uppercase): sidebar group names, grouped-list headings, the system panel's section headings. Always a real heading for the group under it.
- **Numeric** (JetBrains Mono, tabular figures): every quantity, Units value, count badge and portal glyph string.

### Named Rules
**The Readout Rule.** Every number a player compares is JetBrains Mono with `tabular-nums`. Inter never sets a quantity.

**The Short Burst Rule.** Orbitron is for names and titles of a few words; it never sets a sentence.

## Layout

The shell is a sticky 56px header (64px from 1024px) of 90% void with blur and a hairline bottom edge, holding the planet mark and the `ATLAS//MASTER_OS` wordmark. From 1024px a 288px sticky sidebar carries grouped navigation; below it, a fixed five-item tab bar with safe-area padding replaces it, and main content reserves bottom padding for it. Content is capped at 1600px; main padding is 16px on phones, 24px from 640px, 32px from 1024px. Edge-to-edge (`viewport-fit=cover`) with `env(safe-area-inset-*)` on header, body sides, tab bar and sheets.

Screens are a vertical stack of HUD cards 24px apart; side-by-side grids appear only at `lg`/`xl` (two columns, `items-start`). Card padding is 16px on phones and 20px from 640px. Intro copy and long text sit within `max-w-3xl` / `max-w-prose`.

The Calculators planner is a single built-upward column inside its card: a sticky picker bar (bleeding to the card edge, 90% void with blur) under the app header, a horizontal preset rail that scrolls on phones and wraps from 640px, the capstone, the crafting rounds in reverse order (last round first) on a 36px-indented spine, and the cargo hold at the foot. Hold tiles fill an auto grid of 88px minimum (108px from 640px) with 6px gaps (8px from 640px).

Breakpoints are Tailwind's: 640, 768, 1024, 1280px. Reduced motion collapses every transition and animation to zero.

Implementation note (temporary, not a design rule): Tailwind v4 is compiled with Tailwind v3 compatibility shims (v3 preflight, v3's fixed text line heights, v3 `space-y-*` top-margin behaviour, and Tailwind imported after the app's CSS without cascade layers), because the remaining markup was written for v3's CDN. The fixed line heights in Typography come from that shim. The shims go once every screen is React (docs/architecture.md, Styling; ADR-0004); new screens should not depend on them.

## Elevation & Depth

Depth is glass and light. Surfaces separate by translucency (85-92% opaque panels), backdrop blur (12px on cards, 16px with 1.4 saturation on the tab bar) and a hairline tinted edge. Shadows are soft and large, used for lift under floating things (cards, toasts, sheets, menus), or coloured glows that mean state.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 10px 30px -5px rgba(0,0,0,0.5)`): every HUD card.
- **Floating** (`box-shadow: 0 16px 40px -12px rgba(0,0,0,0.8)` to `0 24px 64px -12px rgba(0,0,0,0.85)`): toast, search results, the system sheet.
- **Ready glow** (`box-shadow: 0 4px 14px -4px rgba(52,211,153,0.45)`): a tick target whose inputs are covered; a tighter `0 2px 10px -2px rgba(52,211,153,0.6)` on a ready round's diamond node.
- **Exotic glow** (`box-shadow: 0 0 12px rgba(168,85,247,0.45)`): the supercharged slot.
- **Star glow** (`0 2px 8px -1px <star colour>`): the star-colour dot.
- **Capstone bloom** (animated ring from `0 0 0 0 rgba(52,211,153,0.55)` to `0 0 0 14px transparent`, settling at `0 12px 32px -8px rgba(52,211,153,0.35)`): once, when a plan completes.

### Named Rules
**The Glow Means State Rule.** A coloured glow is never decoration: it marks something ready, lit, exotic or complete. Resting controls carry no glow.

## Shapes

Softly rounded rectangles throughout, scaled by role: 6px for small chips and the in-slot check box, 8px for hold slots and the recipe switch, 10px for segments and nav tiles, 12px for inputs, buttons and tick targets, 16px for cards, grouped lists, the capstone and the hold, full pills for tag filters, status pills, switches and badges. Borders are 1px hairlines everywhere (1.5px only on the exotic slot). The one non-rectangular form is the planner's round node: a 13px square rotated 45° with 3px corners, a diamond on the 1px spine; the hold's landing node is a 17px circle with an up arrow.

## Components

### Buttons
Calm, tinted, and tall enough for a thumb.
- **Shape:** gently rounded (12px).
- **Primary:** solid ready-emerald, slate-deep text, semibold 0.875rem, 48px tall, 20px sides; hover lightens to ready-emerald-lit, active darkens. One per view, for the main creating action (log a system).
- **Secondary:** slate-ground with a control-edge border, 40px tall, ink text; hover brightens the border.
- **Jump:** cyan tint (10%) with a 40% cyan edge and pale cyan text, 40px tall, trailing Phosphor arrow; hover doubles the tint. Used for in-page jumps such as "Start at the cargo hold".
- **Quiet text actions:** 0.75rem ink-muted with a leading bold icon; hover to ink, or to rose for a destructive one (Clear all ticks).
- **Focus:** a 2px scanner-cyan-glow outline offset 2px on every focusable element.

### Chips
- **Tag filter:** 30px full pill, slate-ground, control-edge border, 0.75rem; pressed state is the emerald tint with a 60% emerald edge. Planner presets reuse it.
- **Segment:** 36px, 10px corners; on state emerald tint. The filter variant's pressed state is amber.
- **Status pill:** 24px full pill, tint-and-edge in cyan (new), emerald (ready) or amber (wait), with a bold Phosphor icon.
- **Tag / glyph chip:** 24px, 6px corners, slate fill, 11px; glyphs in mono with wide tracking and a copy icon.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** hud-panel-glass over 12px backdrop blur.
- **Shadow Strategy:** card lift (see Elevation).
- **Border:** 1px hud-edge.
- **Internal Padding:** 16px, 20px from 640px; title row is an Orbitron title with a hue-coded bold icon, then a 0.75rem muted help line.
- **Grouped list:** same surface as a card with hairline row separators and 60px rows, for settings-style lists.

### Inputs / Fields
- **Style:** label above (0.75rem ink-soft), control 6px below: slate-ground fill, control-edge border, 12px corners, 40px tall, white text, cyan caret.
- **Focus:** border shifts to emerald (#34d399), plus the global cyan focus outline where the browser shows it.
- **Numbers:** quantity fields are mono, centred or right-aligned. The planner's quantity sits between two 40px stepper buttons.

### Navigation
- **Sidebar (1024px+):** uppercase group labels; 44px rows with a 32px hue-coded icon tile, 0.8125rem medium text, mono count at the right. Hover is a slate wash; active is a 10% cyan fill with a 30% cyan inset edge and a brighter tile.
- **Tab bar (below 1024px):** five equal cells, 56px, 22px icon over 10.5px label in ink-label; active turns scanner-cyan-pale; icons press to 0.9 scale. Emerald count badge ringed in void.
- **Tool dock (Calculators):** ARIA tabs under the screen header that switch between the recipe planner and the small tools. The planner is the lead cell: a 36px hue icon tile (32px on phones), the Orbitron title and, below it, the plan in progress in mono quantity-cyan at 80% ("×1 Stasis Device · 3/14 gathered"). On phones it fills the first row (48px) over a 3-up row of 44px tool cells, icon and label inline, with no surrounding well; from 640px it is one row (planner 1.5fr, tools 1fr each, all 56px) in a slate-deep well with a hairline edge and 16px corners. Cells are 12px-cornered slate-ground with a control-edge border; the selected cell is a 10% cyan fill with a 50% cyan edge. Selection is navigation, so it takes the scanner cyan of the sidebar's active item, never the emerald of a selected segment (which means on, or done).

### Sheets (phones)
Below 768px every drawer is a bottom sheet: slate-deep, 24px top corners, a hairline control-edge top border, floating shadow, sliding up on `cubic-bezier(0.16, 1, 0.3, 1)` over 300ms behind a 60% void backdrop with a 2px blur. Its only close control is the grab bar: a 40×4 slate pill centred in a full-width 36px button at the top. Tapping it, dragging the header down (past 120px, or a quick flick) or tapping the backdrop closes the sheet; Esc does too. There is no ✕ on a phone. From 768px the same surfaces are side panels or modals with a ✕ and no bar. A sheet holding unsaved typing refuses to close by bar or swipe and says why in a toast.

### Article Index (Codex)
An article's connections lead the page. Below 1024px, directly under the article header, an index bar of chips (36px pills, slate-ground with a control-edge border, a bold cyan Phosphor icon, the label, then the count in mono quantity-cyan at 80%): Contents, Used in, Links to, Mentioned in, Nearby, each shown only when it has entries, scrolling sideways when they overflow. Each opens the index sheet at its list. Once the bar scrolls out of view, a reading strip appears under the header: 40px, 90% void with blur and a hairline bottom edge, the list icon in cyan, the current section's name, and "Index" in pale cyan; it fades in over 200ms. From 1024px the index is the sticky right rail (16rem): "On this page" as a hairline-ruled list with the active section in emerald, then the relation lists, each capped at 12 with a "Show all N" text action.

### Recipe Planner Capstone (signature)
The product crowns the plan. A 16px-cornered card lit from above by a cyan radial gradient over the panel colour, with a 30% cyan edge: the amount in mono quantity-cyan above the Orbitron product name, the norm line ("All crafted from blueprints"), the capstone tick at the right, a status line with the jump button, the one-line recipe, then a two-column readout of product worth (amber) against raw inputs worth (white), with the worth ratio below. When every tick is in, it turns to a 40% deep-emerald fill with a 60% emerald edge and blooms once (1.1s, `cubic-bezier(0.16, 1, 0.3, 1)`); with reduced motion it simply settles with the glow.

### Round Spine and Ready Band (signature)
Rounds stack on a 1px hairline spine 15px from the left. An emerald overlay grows up the spine (scale from the bottom, 700ms ease-out) once a round can be crafted. Each round has a diamond node: hollow slate when waiting, hollow emerald with a ready glow when ready, solid emerald when crafted. A ready round's step list becomes a band: a 6% emerald wash with a 25% inset emerald ring, 12px corners, and its status becomes an emerald tint pill ("Ready to craft"). Crafted rounds can fold away behind a quiet caret action.

### Step Row and Tick Target (signature)
Each step is a row: a 44px tick target, then the mono amount with `×`, the item name (a Codex link underlined in slate, cyan on hover), a muted meta line only where it differs from the plan norm, and the recipe as one line ("10,000 Frost Crystal + 20,000 Solanium") with amounts in mono (emerald for raw, cyan for crafted) and a check after each ticked input. The tick target is a real checkbox drawn as a slot: slate-deep with a hammer icon at rest, emerald tint with glow when ready, solid emerald with a check when done.

### Recipe Switch Preview (signature)
Only where a step has alternatives: a full-width (auto from 640px) 8px-cornered outline button with a cyan cycle icon, "Recipe 1 of 2 · switch to the next", and below it the next recipe's inputs in this plan's amounts plus the signed change in raw inputs' value, emerald when cheaper, amber when dearer. After a switch, the row shows the outcome in the same hues.

### Cargo Hold Inventory Slots (signature)
Raw stock sits at the foot of the column in a slate-deep well with a 16px corner and an up-arrow node where the spine lands. Each material is a square inventory-slot tile: 8px corners, a hairline control-edge frame over a dim slate diagonal gradient, the name top-left (11px, 0.75rem from 640px, two lines max), a 20px check box bottom-left and the amount in mono quantity-cyan bottom-right. Gathered slots take the emerald tint and edge, the name dims, the amount turns emerald.

## Do's and Don'ts

### Do:
- **Do** set every quantity and value in JetBrains Mono with tabular figures, in quantity-cyan for amounts and units-amber-pale for Units.
- **Do** build containers as HUD cards: hud-panel-glass, 12px blur, 1px hud-edge, 16px corners, card-lift shadow.
- **Do** express states as tint-and-edge (10-15% fill, 30-70% border) in the hue that carries the meaning.
- **Do** keep tick and tap targets at 44px (40px minimum for steppers and secondary buttons) and inputs at 1rem below 640px.
- **Do** pair each card title (Orbitron 700, 1rem) with one bold Phosphor icon in the card's semantic hue.
- **Do** honour reduced motion: the shared rule zeroes all transitions; signature moments (the bloom, the spine fill) must settle to their end state.
- **Do** use the cyan focus outline (2px, offset 2px) on every focusable element, including visually hidden checkboxes via their drawn target.

### Don't:
- **Don't** use an accent hue for decoration or outside its meaning (cyan for a Units value, amber for done).
- **Don't** add hard or offset shadows; depth is blur, soft lift and state glow.
- **Don't** set sentences or body copy in Orbitron.
- **Don't** use text glyphs or emoji as icons; Phosphor is the icon set.
- **Don't** put an uppercase mono label above a heading as a kicker; the uppercase label style only names the group it heads.
- **Don't** load fonts, icons or styles from a CDN; everything is bundled.
