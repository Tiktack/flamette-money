# Flamette Money — Design System

<!-- Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app -->
<!-- Pre-emit critique: P4 H4 E5 S5 R5 V4 -->

## Overview

**Genre:** modern-minimal (dev-tool / observability SaaS school)  
**DNA source:** maple.dev (URL mode study)  
**Theme:** Custom amber — "maple dark amber finance"  
**Anchor hue:** 50–58° (warm amber)

This design system applies across all app pages. All pages share one system; the diversification rule for multi-page apps is inverted — every page must follow this system, not differ from it.

---

## Typography

| Role | Value |
|------|-------|
| Display / body font | `"Geist Variable", sans-serif` |
| Mono font | `ui-monospace, "SF Mono", "Fira Code", Menlo, monospace` |
| Display tracking | `-0.025em` (tight, set via `tracking-tight`) |
| Numeric values | `font-variant-numeric: tabular-nums` |

---

## Color Tokens

### Light mode — warm amber, hue 58°

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `oklch(0.970 0.010 58)` | Warm cream paper |
| `--foreground` | `oklch(0.140 0.012 50)` | Near-black warm ink |
| `--card` | `oklch(0.990 0.006 58)` | Pure warm white card surface |
| `--primary` | `oklch(0.56 0.200 50)` | Amber CTA — deep enough for light bg |
| `--primary-foreground` | `oklch(0.985 0.004 58)` | White on amber |
| `--secondary` | `oklch(0.940 0.014 58)` | Secondary warm surface |
| `--muted` | `oklch(0.930 0.012 58)` | Muted warm surface |
| `--muted-foreground` | `oklch(0.520 0.010 55)` | Muted text |
| `--border` | `oklch(0.880 0.012 58)` | Warm hairline |
| `--ring` | `oklch(0.56 0.200 50)` | Amber focus ring |
| `--sidebar` | `oklch(0.955 0.012 58)` | Warm cream sidebar |

### Dark mode — maple DNA, hue 50°

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `oklch(0.120 0.010 50)` | Near-black warm paper |
| `--foreground` | `oklch(0.940 0.008 80)` | Warm off-white ink |
| `--card` | `oklch(0.160 0.012 50)` | Slightly lighter card surface |
| `--primary` | `oklch(0.720 0.160 55)` | Maple amber |
| `--primary-foreground` | `oklch(0.120 0.010 50)` | Dark on amber |
| `--secondary` | `oklch(0.210 0.010 50)` | Dark secondary surface |
| `--muted-foreground` | `oklch(0.620 0.010 60)` | Warm muted text |
| `--border` | `oklch(0.260 0.010 50)` | Warm dark hairline |
| `--sidebar` | `oklch(0.140 0.012 50)` | Sidebar (slightly lighter than bg) |

### Chart palette — amber / warm spectrum

| Token | Value | Hue |
|-------|-------|-----|
| `--chart-1` | `oklch(0.72 0.16 55)` | Maple amber (primary) |
| `--chart-2` | `oklch(0.65 0.18 35)` | Warm orange |
| `--chart-3` | `oklch(0.58 0.15 75)` | Amber-green |
| `--chart-4` | `oklch(0.76 0.12 80)` | Warm yellow |
| `--chart-5` | `oklch(0.60 0.14 20)` | Red-amber |

---

## Spacing

4pt base scale, Tailwind CSS 4 defaults.

---

## Motion

**Stance:** motion-cut (no animation library installed).  
Only `transform` and `opacity` animate. Durations 120–200ms. Easing `ease-out`.  
`prefers-reduced-motion: reduce` collapses to ≤150ms opacity crossfade.

---

## Component voices

- **MetricCard:** Subtle amber top-gradient hairline accent. Tabular-nums on value.
- **EmptyState:** Mono-style eyebrow (no pill background). `text-primary/70` amber.
- **SiteHeader:** Active breadcrumb page in `text-primary` amber. Separator `·`.
- **Auth page:** Wordmark above card. Amber radial glows in background.

---

## Auth page backgrounds

**Light:** `oklch(0.970 0.010 58)` — warm cream with amber radial glows at corners.  
**Dark:** `oklch(0.120 0.010 50)` — near-black amber paper with subtle amber radial glow at top.

---

## Improvements over maple.dev

1. **Full light/dark parity** — maple.dev is dark-only; this system is beautiful in both modes.
2. **Better mobile** — responsive breadcrumbs, collapsible sidebar, no horizontal scroll.
3. **Finance-appropriate type** — tabular-nums on all numeric values throughout.

---

## Exports

### shadcn/ui CSS variables

See `src/styles.css` — all variables follow the shadcn OKLCH convention.

### Tailwind v4 `@theme`

See `@theme inline` block in `src/styles.css` — maps all `--color-*`, `--font-*`, `--radius-*` tokens to Tailwind utilities.
