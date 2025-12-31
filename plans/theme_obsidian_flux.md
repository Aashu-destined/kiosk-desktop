# UI Theme Specification: Obsidian Flux

This document outlines the refined "Obsidian Flux" visual design system, translating the concept of "light trapped within stone" into a concrete UI/UX specification.

## 1. Conceptual Framework

### The Void Anchor (Chassis)
*   **Concept:** A matte, light-absorbing physical chassis. It grounds the interface, representing the solid stone holding the energy.
*   **Visuals:** Deep, matte charcoal/black. Non-reflective.
*   **Hex:** `#0F1115` (A deep, dark gunmetal).

### The Spectral Mesh (Energy)
*   **Concept:** Gradients that bleed *from beneath* the surfaces, as if the stone is translucent and there is a molten core or energy flow underneath.
*   **Visuals:** Complex radial/conic gradients that are never fully sharp.
*   **Logic:** These live on pseudo-elements (`::before`) or background layers behind the glass/frost content.

### The Frost Layer (Diffusion)
*   **Concept:** The surface of the stone is cold and frosted, diffusing the light from the Spectral Mesh.
*   **Visuals:** Variable blur + subtle grain/noise texture.
*   **Implementation:** `backdrop-filter: blur()` combined with a noise SVG or opacity layer.

### Kinetic Signature (Movement)
1.  **Tidal Breath (Idle):** A slow, rhythmic pulsing of the Spectral Mesh's opacity or size.
2.  **Viscous Response (Hover):** UI elements feel like heavy liquid or magnetic pools when hovered. They don't just click; they "pull".
3.  **Depth Actuation (Click):** A satisfying physical depression (scale down) on interaction, confirming the solidity of the "stone".

## 2. Color System & Tokens

### Base Layers
*   `--bg-flux-void`: `#0F1115` (The Anchor - Main App Background)
*   `--bg-flux-panel`: `#161b22` (Panel/Card Background - slightly lighter, semi-transparent)

### Spectral Accents (The Flux)
*   `--flux-primary`: `#8b5cf6` (Violet 500)
*   `--flux-secondary`: `#6366f1` (Indigo 500)
*   `--flux-glow`: `#a78bfa` (Violet 400)
*   `--flux-border`: `rgba(139, 92, 246, 0.2)`

### Text
*   `--text-flux-main`: `#F3F4F6` (Cool White)
*   `--text-flux-muted`: `#9CA3AF` (Cool Gray)

## 3. CSS Implementation Strategy

### Layering Model "Light within Stone"

To achieve the look of light coming *from within*, we avoid simple `box-shadow` on top. Instead, we use layering:

1.  **Base (Void Anchor):** The solid color `#0F1115`.
2.  **Glow (Spectral Mesh):** A `radial-gradient` acting as a localized light source behind the active element or panel.
3.  **Surface (Frost Layer):** The panel itself has a semi-transparent background and `backdrop-filter`.

#### CSS Composition Example (Card)

```css
.flux-card {
  /* 1. Surface & Frost */
  background-color: rgba(22, 27, 34, 0.7); /* --bg-flux-panel with opacity */
  backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid var(--flux-border);
  
  /* Noise Texture (Optional Overlay) */
  background-image: url("data:image/svg+xml,...noise...");
  
  /* 2. Inner Glow (Spectral Mesh Reflection) */
  box-shadow: 
    inset 0 0 20px rgba(139, 92, 246, 0.05), /* Inner subtle tint */
    0 10px 40px -10px rgba(0, 0, 0, 0.5); /* Deep shadow to lift off void */
    
  position: relative;
  overflow: hidden;
}

/* Optional: Active "Mesh" bleeding from bottom */
.flux-card::before {
  content: "";
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1), transparent 60%);
  z-index: -1;
  opacity: 0.5;
  pointer-events: none;
}
```

## 4. Animation Definitions

### Tidal Breath (Idle Pulse)
Applies to the background gradients or "special" buttons to suggest latent energy.

```css
@keyframes tidal-breath {
  0% { opacity: 0.3; transform: scale(1); filter: hue-rotate(0deg); }
  50% { opacity: 0.5; transform: scale(1.05); filter: hue-rotate(5deg); }
  100% { opacity: 0.3; transform: scale(1); filter: hue-rotate(0deg); }
}

.animate-tidal {
  animation: tidal-breath 8s ease-in-out infinite;
}
```

### Viscous Response (Magnetic Hover)
Elements shouldn't just snap; they should "flow" into the hover state.

```css
.flux-interactive {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Fluid easing */
}

.flux-interactive:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 
    0 0 30px rgba(139, 92, 246, 0.3),
    inset 0 0 20px rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.6);
}
```

### Depth Actuation (Click)
The "click" feels like pressing into a dense material.

```css
.flux-interactive:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.1); /* Glow dims slightly */
  transition: all 0.1s ease-out; /* Fast response */
}
```

## 5. Refactor Roadmap

1.  **Update `src/index.css`:**
    *   Modify `[data-theme='obsidian']` variables to match the new `#0F1115` palette.
    *   Add utility classes for `.flux-card`, `.flux-text`.
    *   Insert the Keyframes for `tidal-breath`.

2.  **Component Updates:**
    *   Apply `.flux-card` classes to the main containers in `Layout.tsx` and `Dashboard.tsx`.
    *   Ensure inputs and buttons use the `flux-interactive` transition logic.