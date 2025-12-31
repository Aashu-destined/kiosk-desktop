# UI Theme Specification: Celestial Night

This document translates the "Celestial Night Scene" visual composition request into a concrete UI/UX Design System for the Kiosk Transaction Manager (Dark Mode).

## 1. Design Reasoning (Chain of Thought)

### Atmosphere (The Background)
*   **Goal:** Establish a deep, immersive dark sky that isn't just "black".
*   **UI Translation:** Instead of pure black (`#000`), we will use deep, rich tones like **Obsidian** or **Ink Blue**. This reduces eye strain and provides a premium feel. We will use a subtle radial gradient to mimic the depth of space—lighter near the center/top (the light source) and darker at the edges.

### Star Density (The Content/Texture)
*   **Goal:** Natural backdrop, not cluttered.
*   **UI Translation:**
    *   **Primary Content (Stars):** High contrast white/off-white text (`#e2e8f0`) to pop against the dark background.
    *   **Secondary Content (Distant Stars):** Muted slate/blue-gray text (`#94a3b8`) to recede into the background.
    *   **Texture:** Subtle noise or grain in the background color could simulate distant stars without distinct pixels.

### Subtlety of Motion (The Comets)
*   **Goal:** Elegant, understated movement.
*   **UI Translation:**
    *   **Interaction:** Hover states and transitions should be smooth (ease-in-out) and slightly slower than usual (300-500ms) to mimic "falling gracefully".
    *   **Accents:** Use a "Comet" accent color—a soft, glowing cyan or pale blue (`#38bdf8`)—for active states, buttons, or focus rings. It should have a soft `box-shadow` (glow) rather than a hard edge.

### Composition (Layout & Light)
*   **Goal:** Guide the viewer's eye.
*   **UI Translation:** The "Shadow Island" concept still applies but inverted.
    *   **Islands:** Slightly lighter panels (Deep Charcoal/Midnight Blue) floating on the Ink Blue background.
    *   **Lighting:** Instead of drop shadows creating depth downwards, we might use "inner glows" or subtle top-borders to suggest light catching the top edge of the panel (rim lighting).

## 2. Color Palette (Tailwind Tokens)

### Backgrounds (The Sky)
*   `--bg-celestial-deep`: `#0f172a` (Slate 900 - Ink Blue base)
*   `--bg-celestial-void`: `#020617` (Slate 950 - Obsidian)

### Surfaces (The Islands)
*   `--bg-starship`: `#1e293b` (Slate 800) - Slightly lighter panel
*   `--bg-starship-hover`: `#334155` (Slate 700)

### Accents (The Comets)
*   `--accent-comet`: `#38bdf8` (Sky 400) - The glowing core
*   `--accent-comet-dim`: `#0ea5e9` (Sky 500)
*   `--glow-comet`: `0 0 15px rgba(56, 189, 248, 0.5)`

## 3. Implementation Plan

1.  **Tailwind Config:** Add a `celestial` theme extension.
2.  **CSS Variables:** Define the variables for easy switching.
3.  **Component Updates:**
    *   **App Background:** Use a radial gradient of Deep Sky to Void.
    *   **Cards:** Use semi-transparent dark blues with a 1px border of `rgba(255,255,255,0.1)` (Rim Light).