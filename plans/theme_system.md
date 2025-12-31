# Theme Management System Plan

This document outlines the architecture and implementation strategy for a multi-theme system in the Kiosk Transaction Manager, supporting **Light**, **Dark**, and the signature **Celestial** modes.

## 1. Objectives

*   **Multi-mode Support:** Seamless switching between Light, Dark, and Celestial themes.
*   **Persistence:** Remember user preference across sessions.
*   **System Sync:** Option to respect OS system preferences (Light/Dark).
*   **Maintainability:** Use semantic CSS variables to avoid cluttering components with theme-specific utility classes (e.g., avoid `dark:bg-slate-900 celestial:bg-void`).

## 2. Supported Themes

1.  **Light (Business Day):** High contrast, white/slate backgrounds, crisp borders. Professional and legible in bright environments.
2.  **Dark (Standard Night):** Slate-based dark mode (`slate-900`), easier on the eyes, standard industry dark mode.
3.  **Celestial (Immersive):** The premium "Starfield" theme defined in `plans/theme_celestial_night.md`, featuring deep obsidian backgrounds, radial gradients, and comet accents.

## 3. Technical Architecture

### A. State Management (React Context)

We will implement a `ThemeContext` to manage the active state globally.

**Types:**
```typescript
type ThemeMode = 'light' | 'dark' | 'celestial';
type ThemePreference = ThemeMode | 'system';

interface ThemeContextType {
  theme: ThemeMode;             // The currently active visual theme
  preference: ThemePreference;  // What the user selected (can be 'system')
  setPreference: (pref: ThemePreference) => void;
}
```

### B. Persistence Strategy

*   **Storage:** `localStorage` key `kiosk-ui-theme`.
*   **Initialization Logic:**
    1.  Read `localStorage`.
    2.  If value is specific ('light', 'dark', 'celestial'), use it.
    3.  If value is 'system' or missing:
        *   Check `window.matchMedia('(prefers-color-scheme: dark)')`.
        *   If matches -> default to **Dark** (or Celestial if we want that as default dark).
        *   Else -> **Light**.

### C. DOM Injection

Instead of using Tailwind's `class="dark"`, we will use a data attribute on the root HTML element. This allows for >2 themes.

*   **DOM Structure:** `<html data-theme="celestial">`
*   **Tailwind Config:** We will configure Tailwind to use CSS variables that change based on this attribute.

## 4. CSS Variable Strategy (Semantic Tokens)

To keep code clean, components will use **Semantic Names** (what it *is*) rather than **Color Names** (what color it is).

### Semantic Token Mapping

| Semantic Token | Light Value | Dark Value | Celestial Value |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) | `#020617` (Void) |
| `--bg-panel` | `#ffffff` (White) | `#1e293b` (Slate 800) | `#1e293b` (Slate 800/40) |
| `--text-primary` | `#0f172a` (Slate 900) | `#f1f5f9` (Slate 100) | `#f1f5f9` (Slate 100) |
| `--text-muted` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | `#94a3b8` (Slate 400) |
| `--border-base` | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) | `rgba(255,255,255,0.1)` |
| `--accent-primary`| `#0ea5e9` (Sky 500) | `#38bdf8` (Sky 400) | `#38bdf8` (Comet) |

### Implementation in `src/index.css`

```css
@layer base {
  /* Default (Light) variables */
  :root {
    --bg-app: 248 250 252; /* RGB values for opacity support */
    --bg-panel: 255 255 255;
    /* ... */
  }

  /* Dark Theme Overrides */
  [data-theme='dark'] {
    --bg-app: 15 23 42;
    --bg-panel: 30 41 59;
    /* ... */
  }

  /* Celestial Theme Overrides */
  [data-theme='celestial'] {
    --bg-app: 2 6 23;
    --bg-panel: 30 41 59; /* Applied with opacity in utility */
    /* ... */
  }
}
```

### Tailwind Configuration Extension

We will extend the color palette to use these variables.

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      // Semantic colors utilizing the CSS vars
      app: 'rgb(var(--bg-app) / <alpha-value>)',
      panel: 'rgb(var(--bg-panel) / <alpha-value>)',
      // ...
    }
  }
}
```

## 5. Execution Roadmap

1.  **Refactor CSS:** Update `src/index.css` to define the CSS variable tiers (`:root`, `[data-theme='dark']`, `[data-theme='celestial']`).
2.  **Update Tailwind:** Modify `tailwind.config.js` to map semantic names to these variables.
3.  **Create Context:** Implement `src/contexts/ThemeContext.tsx`.
4.  **Wrap App:** Add `ThemeProvider` to `src/main.tsx`.
5.  **UI Switcher:** Add a theme toggle mechanism in `Settings` or the `Sidebar`.