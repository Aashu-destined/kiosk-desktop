# UI/UX Design System: The "Shadow Island" Effect

This document defines the visual design strategy for the Kiosk Transaction Manager, focusing on the "Shadow Island" component style to create depth, clarity, and modern aesthetics.

## 1. Visual Hierarchy & Philosophy

The "Shadow Island" concept aims to lift content off the background, making it distinct and focused.

*   **Background:** A subtle, cool neutral tone (e.g., slate/gray-50) to recede into the distance.
*   **The Island:** A pure white container with specific rounded corners and padding.
*   **The Elevation:** Instead of a single harsh shadow, we use layered box-shadows:
    *   *Ambient Shadow:* Large spread, high blur, very low opacity. Creates the "softness".
    *   *Direct Shadow:* Smaller spread, tighter blur, slightly higher opacity. Creates the "grounding".

## 2. CSS Variables / Design Tokens

We will implement these in `tailwind.config.js` or standard CSS variables.

### Colors
*   `--bg-app`: `#f8fafc` (Slate 50) - The ocean.
*   `--bg-island`: `#ffffff` (White) - The island.
*   `--text-primary`: `#1e293b` (Slate 800) - High contrast text.
*   `--text-secondary`: `#64748b` (Slate 500) - Supporting text.

### Shadow System
*   **Island Shadow (Soft Lift):**
    *   Layer 1: `0 4px 6px -1px rgba(0, 0, 0, 0.05)` (Grounding)
    *   Layer 2: `0 10px 15px -3px rgba(0, 0, 0, 0.05)` (Ambient)
    *   Layer 3: `0 0 0 1px rgba(0, 0, 0, 0.02)` (Border definition without a border)

### Spacing & Shape
*   **Radius:** `1rem` (16px) - Friendly and modern.
*   **Padding:** `1.5rem` (24px) - Spaciousness is luxury.

## 3. HTML Structure (Blueprint)

```html
<!-- The Ocean (App Background) -->
<div class="min-h-screen bg-slate-50 p-8">
  
  <!-- The Island (Component) -->
  <div class="bg-white rounded-2xl shadow-island p-6 relative overflow-hidden">
    
    <!-- Header -->
    <div class="mb-6 border-b border-slate-100 pb-4">
      <h2 class="text-xl font-bold text-slate-800">Transaction Details</h2>
    </div>

    <!-- Content -->
    <div class="space-y-4">
      <!-- ... -->
    </div>

  </div>
</div>
```

## 4. Implementation Strategy

1.  **Tailwind Config:** Extend the `boxShadow` theme with a custom class `shadow-island`.
2.  **Global CSS:** Ensure `body` has the correct neutral background.
3.  **Refactoring:** Apply this class to:
    *   The Sidebar container.
    *   The main content areas (Transaction Forms, Tables, Charts).
    *   Modal windows.

## 5. Reasoning

*   **Soft Borders:** We avoid strict `1px solid gray` borders in favor of shadows or very faint borders (`rgba(0,0,0,0.05)`). This reduces visual noise.
*   **Multi-layered Shadows:** A single shadow looks artificial. Layering mimics real-world lighting where light bounces.