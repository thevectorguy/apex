# Design System: Refined Futurism

## 1. Overview & Creative North Star
**The Creative North Star: "The Kinetic Cockpit"**

This design system transcends traditional car showroom interfaces by merging the visceral, high-performance atmosphere of a Ferrari digital instrument cluster with the ethereal, spatial precision of Apple Vision Pro. We are not building a catalog; we are building a command center.

The "Kinetic Cockpit" philosophy dictates that the UI should feel like a living, breathing machine. We break the "template" look through **intentional asymmetry**—using off-center focal points for vehicle hero shots—and **tonal depth**, where elements aren’t just placed on a grid, but "docked" into a sophisticated multi-layered environment. High-contrast typography scales (the massive `display-lg` vs. the minute `label-sm`) create an editorial feel that mirrors luxury automotive print catalogs.

---

## 2. Colors & Surface Logic

### The Palette
*   **Primary (Electric Blue):** `#a4c9ff` / `primary_container: #4a9eff`. Used for high-energy data points and active states.
*   **Secondary (Champagne Gold):** `#e3c285`. Reserved for "Heritage" and "Luxury" touchpoints—signatures, limited edition badges, or premium concierge CTAs.
*   **Neutral (Platinum & Ink):** The foundation is built on `#131318` (Surface) and `#e4e1e9` (On-Surface).

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** To achieve a "Refined Futurism," boundaries must be defined solely through background color shifts or subtle tonal transitions. Use `surface_container_low` for secondary sections and `surface_container_high` for elevated interactive modules. If you feel the need for a line, use a spacing gap (`spacing.1`) or a gradient transition instead.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers:
1.  **Base Layer:** `surface_dim` (#131318) - The deep "void" of the cockpit.
2.  **Intermediate:** `surface_container` (#1f1f25) - Standard content areas.
3.  **Top Layer:** `surface_container_highest` (#35343a) - Interactive cards or active modals.
*Nesting Example:* A `surface_container_lowest` card sitting inside a `surface_container_low` section creates a recessed, "machined" look without a single stroke.

### The "Glass & Gradient" Rule
Floating elements (modals, navigation bars) must utilize **Glassmorphism**. Apply `surface_variant` at 40% opacity with a `20px` backdrop blur. To add "soul," use a subtle linear gradient from `primary` to `primary_container` at 15% opacity on large hero backgrounds to mimic the glow of a dashboard.

---

## 3. Typography
Our typography creates a dialogue between high-tech precision and editorial elegance.

*   **Display & Headlines (Space Grotesk):** Chosen for its technical, wide-set proportions. Use `display-lg` (3.5rem) for vehicle names to create an imposing, architectural presence.
*   **Body & Titles (Inter/SF Pro):** Used for legibility. `body-md` is the workhorse for technical specs.
*   **The Hierarchy Strategy:** Use extreme contrast. Pair a `display-lg` headline in `on_surface` with a `label-sm` technical spec in `secondary` (Champagne Gold). This mimics the look of high-end telemetry data.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering**. Instead of drop shadows, "stack" your tokens. Place a `surface_container_highest` element over a `surface` background to create a natural optical lift.

### Ambient Shadows
For floating action buttons or car configurator cards, use **Ambient Shadows**:
*   **Blur:** 40px - 60px.
*   **Opacity:** 4%-8%.
*   **Color:** Use a tinted version of `surface_tint` (Electric Blue) rather than black. This simulates the light spill from a high-end OLED dashboard.

### The "Ghost Border" Fallback
If accessibility requires a container definition, use a **Ghost Border**: `outline_variant` (#414752) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary_container` (#4a9eff) with `20pt (xl)` corner radius. Text in `on_primary_fixed`.
*   **Secondary (Glass):** `surface_bright` at 20% opacity + `20px` backdrop blur. Champagne Gold text for a premium feel.
*   **States:** On hover, apply a `0.5rem` outer glow using `primary`.

### Data Visualization (The Telemetry)
*   **Precision Gauges:** Use 2px thick circular strokes with `primary` for the value and `outline_variant` at 10% for the track.
*   **Micro-Labels:** All data labels must be in `label-sm` with 0.05rem letter spacing.

### Cards & Lists
*   **The Divider Ban:** Never use line dividers. Separate car listings using `spacing.6` (2rem) of vertical white space or a shift from `surface` to `surface_container`.
*   **Corner Radii:** Strictly `20pt (xl)` for all containers to mirror the ergonomic curves of a modern steering wheel.

### Input Fields
*   **Form Factor:** "Bottom-Heavy" styling. No full box; use a `surface_container_low` background with a 2px highlight in `primary` only on the bottom edge when focused.

---

## 6. Do's and Don'ts

### Do
*   **DO** use intentional asymmetry. Place the car image 1/3rd off-screen to create kinetic energy.
*   **DO** use "Carbon Fiber" textures (subtle 4px diagonal patterns) as a background overlay at 3% opacity for a tactile, automotive feel.
*   **DO** use wide letter spacing on `label` components to enhance the "technical" vibe.

### Don't
*   **DON'T** use 100% opaque borders or dividers. They kill the "Glassmorphism" illusion.
*   **DON'T** use standard 4pt or 8pt corner radii. It looks generic; stay locked at `20pt` for that "Apple Vision Pro" material feel.
*   **DON'T** use pure black (#000000). Use `surface_container_lowest` (#0e0e13) to keep the "Ink" depth while allowing for subtle nested shadows.