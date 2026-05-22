# Design System — Personal AI Workstation

## Aesthetic Direction
"Monochrome Precision" — futuristic, sleek, and quiet. Think Sandbar's monumental restraint 
and Apple's surgical clarity: white surfaces, precise typography, generous negative space. 
The UI should feel like polished hardware — minimal, confident, and invisible until needed.

Reference moods:
- Sandbar.com: monumental objects on neutral ground, type that whispers
- Apple.com / macOS: frosted glass, pure white surfaces, negative space
- Linear.app: clean sans-serif hierarchy, subtle borders, no decoration
- Futuristic research terminal: functional, calm, no visual noise

## Color Palette

```css
:root {
  /* Backgrounds */
  --color-void: #ffffff;          /* page canvas — pure white */
  --color-obsidian: #ffffff;      /* primary surface — pure white */
  --color-basalt: #ffffff;        /* elevated surface — white cards */
  --color-ash: #f5f5f7;          /* alternate surface — soft gray */
  --color-frost: #e8e8ed;         /* borders, dividers, scrollbars */

  /* Neutrals */
  --color-pumice: #86868b;        /* muted text, labels */
  --color-steam: #6e6e73;         /* secondary text */
  --color-bone: #1d1d1f;          /* primary text — near-black */
  --color-glacier: #000000;       /* headings, emphasis — pure black */

  /* Accents — use sparingly */
  --color-moss: #34c759;          /* success states */
  --color-aurora: #0071e3;        /* interactive accent, links, active states */
  --color-ember: #ff3b30;         /* destructive / critical CTAs only */
  --color-geothermal: #5856d6;   /* rare secondary accent, almost never */

  /* Functional */
  --color-surface-glass: rgba(255, 255, 255, 0.72);
  --color-border-subtle: rgba(0, 0, 0, 0.06);
  --color-border-active: rgba(0, 0, 0, 0.12);
  --color-shadow-soft: rgba(0, 0, 0, 0.06);
  --color-shadow-hover: rgba(0, 0, 0, 0.1);
}
```

Primary color is **white** (`--color-obsidian`). The canvas is a soft neutral gray 
(`--color-void`). Text hierarchy runs from pure black (`--color-glacier`) down through 
near-black (`--color-bone`) to muted gray (`--color-pumice`).

## Typography

Primary: **Geist** (all UI text, labels, navigation, body) — clean, modern, neutral
Secondary: **Geist Mono** (timestamps, counts, code, raw data only) — never for navigation or labels

Rules:
- Default to Geist sans everywhere — no mono labels, no all-caps navigation
- Headings: Geist, medium weight (500), tight tracking (-0.02em)
- Section labels: Geist, 12px, medium weight, `--color-pumice`, sentence case
- Navigation tabs: Geist, 14px, medium weight, normal case
- Numbers and stats: Geist Mono only when displaying raw data
- Never use bold (700+) — use size and weight (400/500) contrast instead
- Body text: 15px, `--color-bone`, 1.5 line-height, -0.01em tracking

## Spacing & Layout

Base unit: 4px
Use: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128

Layout approach:
- Primary layout: generous single-column or responsive grid
- Panel padding: 24–32px
- Let elements breathe — density is earned, not default
- Page margins: 24px minimum on all sides

## Surfaces & Depth

3 levels of depth:
1. Base: `--color-void` (page canvas), no border
2. Raised: `--color-obsidian` (white), border `--color-border-subtle`, soft shadow optional
3. Floating: `--color-obsidian`, backdrop-blur, border `--color-border-active`, shadow

Frosted glass pattern (navbar, modals, overlays):
```css
background: var(--color-surface-glass);
backdrop-filter: blur(20px) saturate(1.8);
border: 1px solid var(--color-border-subtle);
```

Soft shadow for elevated cards:
```css
box-shadow: 0 1px 3px var(--color-shadow-soft);
```

## Motion (Framer Motion)

Philosophy: precise and calm — fast enough to feel responsive, slow enough to feel intentional
- Page transitions: 400ms, ease [0.16, 1, 0.3, 1]
- Element reveals: staggered, 60ms between items, fade + 8px translateY
- Hover states: 200ms, subtle shadow or border shift
- Never: spring physics, bouncy easings, spinning loaders

Standard reveal variant:
```js
const reveal = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }
  })
}
```

## Texture & Atmosphere

- Subtle noise overlay on backgrounds: 2–3% opacity SVG noise filter
- No hard drop shadows — use soft diffuse shadows or border-only depth
- Hover glow: `box-shadow: 0 4px 24px var(--color-shadow-hover)`
- Scrollbars: styled thin, transparent track, `--color-frost` thumb

## Component Conventions

- Border radius: 8px (compact), 12px (cards), 16px (large surfaces), 9999px (pills)
- Icons: Lucide React, 16px in UI, 20px in navigation, strokeWidth={1.5}
- Agent button: white pill/circle with Ion logo SVG, soft shadow on hover
- Loading states: a single thin progress bar at top (like GitHub), never spinners
- Empty states: small sans label in `--color-pumice`, no illustration

## Cursor Instructions

When building components, always:
1. Pull colors exclusively from CSS variables — never hardcode hex values
2. Use Geist sans for all UI text; reserve Geist Mono for data/code only
3. Apply the reveal animation variant to any list or grid of items
4. Keep interactive states subtle — shadow shifts, not color explosions
5. When in doubt, add more space, not more elements
6. White is the primary surface — the UI should feel light, open, and precise
