# Celestial Animations: Moving Stars & Falling Comets

This document outlines the technical implementation for adding dynamic, yet subtle, motion to the Celestial Night theme.

## 1. Design Philosophy

*   **Subtlety:** The movement must not distract from the main task (recording transactions).
*   **Performance:** Animations should run on the GPU (Composite Layer) using `transform` and `opacity` to avoid re-layouts.
*   **Depth:** Parallax effects will create a sense of vastness.

## 2. Animation Layers

### Layer A: The Starfield (Background)
*   **Visual:** Tiny white dots of varying opacity.
*   **Motion:** Slow rotation or drift.
*   **Implementation:**
    *   Use CSS `box-shadow` to generate hundreds of stars on a single `div` to minimize DOM nodes.
    *   Animate the `background-position` or rotate a large container very slowly (100s+ duration).

### Layer B: Twinkling Stars (Mid-ground)
*   **Visual:** Slightly brighter stars that pulse.
*   **Motion:** Opacity shifts from 0.3 to 0.8.
*   **Implementation:** CSS Keyframes `animate-twinkle`.

### Layer C: Falling Comets (Foreground Events)
*   **Visual:** A streak of light with a fading tail (`linear-gradient`).
*   **Motion:** Rapid movement diagonally across the screen, appearing at random intervals.
*   **Implementation:**
    *   A React component `Starfield.tsx` that manages an array of "Comet" objects.
    *   Use `requestAnimationFrame` or simple CSS animations with random delays to trigger them.
    *   **Trajectory:** Top-right to Bottom-left (falling).

## 3. Technical Specs

### CSS Keyframes (Tailwind Extension)

```css
@keyframes fall {
  0% { transform: translateX(0) translateY(0) rotate(45deg); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateX(-500px) translateY(500px) rotate(45deg); opacity: 0; }
}

@keyframes drift {
  from { transform: translateY(0); }
  to { transform: translateY(-2000px); }
}
```

### Component Structure (`src/components/Starfield.tsx`)

```tsx
return (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="stars-small animate-drift-slow" />
    <div className="stars-medium animate-drift-medium" />
    {/* Comets generated dynamically */}
    <div className="comet absolute top-0 right-0 w-2 h-2 bg-white..." />
  </div>
)