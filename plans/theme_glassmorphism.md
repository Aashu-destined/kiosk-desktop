# Theme Specification: Apple Glassmorphism (v2)

## Design Philosophy: "Depth & Vibrancy"
This specification moves beyond basic transparency to emulate the **macOS Big Sur** and **visionOS** aesthetic. The core principle is not just "see-through", but "light-interacting".

**Key Technical Shifts for v2:**
1.  **Saturated Blur:** Using `backdrop-filter: blur(25px) saturate(180%)`. This is the "Apple Secret" – it boosts the colors of the background passing through the glass, making text more legible and the surface feel rich.
2.  **Specular Edges:** Using a 1px semi-transparent white border *plus* an inner white highlight to simulate the thickness of cut glass.
3.  **Aurora Background:** A moving, multi-color mesh gradient that ensures the glass always has something beautiful to refract.

---

## 1. Core Variables (`src/index.css`)

We define strict RGBA values. The `bg-panel` is white but with extremely low opacity, relying on the blur and saturation to create the "surface".

```css
[data-theme='glass'] {
  /* 
   * Base Colors 
   */
  --bg-app: 240 248 255; /* Fallback */
  --bg-panel: 255 255 255; /* Pure White foundation */
  
  /* 
   * Typography 
   * Dark Blue-Greys for maximum contrast on light glass 
   */
  --text-primary: 23 37 84; /* Blue-950 (Deep Navy) */
  --text-muted: 71 85 105; /* Slate-600 */
  
  /* 
   * Borders & Accents 
   */
  --border-base: 255 255 255; /* Used for the frost line */
  --accent-primary: 0 113 227; /* Apple System Blue */
  --accent-glow: 56 189 248; /* Cyan glow for active states */
}
```

---

## 2. The "Aurora" Background

This is a CSS-only animated background. It uses multiple radial gradients moving in slow orbits to create a "Lava Lamp" effect behind the UI.

**Implementation Strategy:**
Add this to `[data-theme='glass'] body`.

```css
[data-theme='glass'] body {
  background-color: #f3f4f6;
  
  /* The Aurora Mesh */
  background-image: 
    radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
    radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), 
    radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
    /* Note: Ideally we want brighter colors for a "Day" glass theme, 
       or we can stick to the "Big Sur" vibrant colored abstract wallpapers.
       Let's go with a 'California Coast' vibrant palette below: */
       
  background-image: 
      radial-gradient(at 0% 0%, rgba(132, 250, 176, 0.4) 0px, transparent 50%),
      radial-gradient(at 50% 100%, rgba(143, 211, 244, 0.4) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(255, 164, 164, 0.3) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(162, 155, 254, 0.3) 0px, transparent 50%);
      
  background-attachment: fixed;
  background-size: 200% 200%;
  animation: aurora-move 20s ease infinite;
}

@keyframes aurora-move {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

## 3. The "Premium Glass" Material

This overrides `.card-island`.

**Key attributes:**
*   `bg-white/40`: 40% opaque white.
*   `backdrop-blur-xl`: Heavy blur (24px+).
*   `backdrop-saturate-150`: Increases vibrancy of what's behind it.
*   `shadow-glass`: A specialized shadow stack.

```css
[data-theme='glass'] .card-island {
  /* 1. The Material */
  background: rgba(255, 255, 255, 0.65); /* Higher opacity for legibility */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  
  /* 2. The Edge (Simulating cut glass) */
  border: 1px solid rgba(255, 255, 255, 0.8);
  
  /* 3. The Depth */
  box-shadow: 
    /* Inner highlight top-left */
    inset 1px 1px 0px 0px rgba(255, 255, 255, 0.5),
    /* Soft drop shadow */
    0 20px 40px -10px rgba(0, 0, 0, 0.1);
    
  border-radius: 24px; /* More rounded like macOS/iOS */
}
```

---

## 4. Interactive Elements

Inputs and Buttons need to feel like "indentations" or "floating shards" above the base glass layer.

### Input Fields
Inputs should look like "cutouts" in the glass—slightly darker/more opaque to signify depth.

```css
[data-theme='glass'] .input-celestial {
  /* Darker/More Opaque than the card to show 'depth' */
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: #1e293b; /* Slate 800 */
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02); /* Slight inner shadow */
  backdrop-filter: blur(10px);
  border-radius: 12px;
}

[data-theme='glass'] .input-celestial:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: #3b82f6; /* Blue 500 */
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  outline: none;
}
```

### Sidebar / Navigation
The sidebar should be the "Frostiest" element.

```css
[data-theme='glass'] aside {
  background: rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: blur(30px) saturate(200%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.4);
}
```

---

## 5. Implementation Guide (Copy-Paste)

### Step A: Update `src/index.css` - Body & Animation

Add this block to the bottom of `src/index.css` or within the `@layer base` block:

```css
/* GLASS THEME V2 */

[data-theme='glass'] body {
  background-color: #f0f9ff;
  /* Premium Aurora Gradient */
  background-image: 
      radial-gradient(at 0% 0%, rgba(167, 243, 208, 0.5) 0px, transparent 50%), /* Teal */
      radial-gradient(at 100% 0%, rgba(165, 243, 252, 0.5) 0px, transparent 50%), /* Cyan */
      radial-gradient(at 100% 100%, rgba(253, 164, 175, 0.5) 0px, transparent 50%), /* Rose */
      radial-gradient(at 0% 100%, rgba(221, 214, 254, 0.5) 0px, transparent 50%); /* Violet */
  background-attachment: fixed;
  background-size: 150% 150%;
  animation: aurora 15s ease infinite alternate;
}

@keyframes aurora {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}
```

### Step B: Update `src/index.css` - Components

Update the `[data-theme='glass']` overrides in `@layer components`:

```css
  /* Glass V2 Card */
  [data-theme='glass'] .card-island {
    @apply backdrop-blur-2xl transition-all duration-300;
    
    /* The Material Recipe */
    background: rgba(255, 255, 255, 0.65);
    
    /* Border: Crisp white edge */
    border: 1px solid rgba(255, 255, 255, 0.6);
    
    /* Shadows: Soft diffusion + Inner Highlight (Top/Left) */
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.05),
      0 20px 40px -10px rgba(0, 0, 0, 0.05),
      inset 0 0 0 1px rgba(255, 255, 255, 0.5); /* Inner ring */
  }

  /* Glass V2 Inputs */
  [data-theme='glass'] .input-celestial {
    @apply backdrop-blur-md transition-all duration-200;
    
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: #0f172a; /* Slate 900 */
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
  }

  [data-theme='glass'] .input-celestial:focus {
    background: rgba(255, 255, 255, 0.85);
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }