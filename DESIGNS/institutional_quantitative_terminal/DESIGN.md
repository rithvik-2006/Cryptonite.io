---
name: Institutional Quantitative Terminal
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c6c6cf'
  on-secondary: '#2f3037'
  secondary-container: '#45464e'
  on-secondary-container: '#b4b4bd'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e2e1eb'
  secondary-fixed-dim: '#c6c6cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#45464e'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 16px
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1600px
  sidebar-width: 240px
  panel-gap: 1px
  margin-xs: 0.25rem
  margin-sm: 0.5rem
  margin-md: 1rem
  margin-lg: 1.5rem
  padding-cell: 0.75rem
---

## Brand & Style
The design system is engineered for professional quantitative analysts and institutional traders on the Solana network. It prioritizes precision, speed, and cognitive clarity over decorative elements.

The aesthetic is a fusion of high-end consumer hardware interfaces and professional developer tools. It leverages **Minimalism** to reduce visual noise, ensuring that complex data sets and AI-generated insights remain the primary focus. The emotional response is one of absolute control, reliability, and "dark-room" focus, typical of high-stakes financial environments. 

Key attributes:
- **High Information Density:** Maximum data throughput without sacrificing legibility.
- **Precision-Grade:** Every pixel serves a functional purpose.
- **Quiet Authority:** A monochrome palette that allows the data's performance (green/red) to speak loudest.

## Colors
The palette is strictly functional, utilizing a deep-black foundation to minimize eye strain during extended research sessions. 

- **Primary:** Pure White (#FFFFFF) is reserved for active states, primary actions, and critical headers.
- **Base:** The background (#090909) and surface (#121212) layers provide a subtle tonal separation for layout containers.
- **Borders:** A consistent #262626 hex is used for all structural divisions, creating a "blueprint" feel.
- **Semantic Colors:** Success, Danger, and Warning colors are slightly desaturated to prevent "vibration" against the dark background, ensuring they remain professional rather than neon.

## Typography
This design system employs a dual-font strategy to distinguish between narrative UI elements and technical data.

- **Geist:** Used for all interface controls, navigation, and descriptive text. Its clean, geometric sans-serif nature provides a modern, engineered feel.
- **JetBrains Mono:** Mandated for all numerical data, wallet addresses, transaction hashes, and quantitative metrics. The monospaced nature ensures that columns of numbers align perfectly in tables and data grids, facilitating rapid scanning.

**Hierarchy Note:** Use `label-caps` for table headers and section metadata to provide a clear structural anchor without requiring large font sizes.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model designed for widescreen terminal usage.

- **Sidebar:** A persistent 240px left sidebar for primary navigation (Markets, Research, Portfolio, AI Lab).
- **Workspace:** A multi-panel system using a 1px "grid-line" approach (achieved via borders or background gaps) to separate modular widgets.
- **Density:** We utilize a "Tight-Fluid" rhythm. While margins between major containers are generous (24px), internal component spacing is compact (12px) to ensure high data visibility.
- **Breakpoints:** 
    - Desktop (1440px+): Full multi-column workspace.
    - Laptop (1024px-1439px): Sidebar collapses to icons; panels stack into tabs.
    - Mobile: Single-stream view; complex tables switch to list-cards.

## Elevation & Depth
Depth is expressed through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows, maintaining a flat, professional profile.

- **Level 0 (Background):** #090909. The "canvas" layer.
- **Level 1 (Surface):** #121212. Used for cards, panels, and sidebars.
- **Level 2 (Interaction):** #1C1C1C. Used for hover states on list items or buttons.
- **Borders:** All Level 1 surfaces must have a 1px solid border of #262626.
- **Shadows:** Only used on floating elements like dropdown menus or modals. Use a very soft, high-spread shadow: `0 10px 30px -10px rgba(0,0,0,0.5)`.

## Shapes
The shape language balances the rigidity of financial data with the approachable sophistication of modern software.

- **Standard Containers:** Use 0.5rem (8px) for internal components like inputs and buttons.
- **Large Cards:** Use 1rem (16px) for major workspace panels and terminal windows to create a soft, "encapsulated" feel.
- **Data Points:** Status indicators and small tags use a pill-shape (full radius) to contrast against the rectangular grid.

## Components
Consistent component styling ensures the terminal feels like a single, unified tool.

- **Buttons:** 
  - *Primary:* Solid White background, Black text. No shadow.
  - *Secondary:* Transparent background, #262626 border, White text.
- **Input Fields:** Background #090909, border #262626. On focus, the border turns White. Use JetBrains Mono for the input text.
- **Data Tables:** No vertical borders. Horizontal borders only (#1C1C1C). Header row uses `label-caps` typography. Row hover state uses #121212.
- **Chips/Badges:** Small, low-contrast backgrounds (e.g., #1C1C1C) with `data-sm` typography. 
- **AI Insight Cards:** Distinguish AI-generated content with a subtle left-hand border accent in a muted gradient or a very faint "glow" shadow to indicate its distinct source.
- **Scrollbars:** Minimalist; 4px width, #262626 track, #404040 handle. Hidden until hover.