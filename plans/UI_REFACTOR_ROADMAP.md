# Comprehensive UI/UX Refactoring Roadmap: Kiosk Transaction Manager

## Executive Summary
This roadmap outlines the strategic transformation of the **Kiosk Transaction Manager** from its current state into a scalable, maintainable, and professional-grade application.

**Current State:**
*   **Strengths:** Functional "Happy Path", robust backend (SQLite/Electron), established theme engine (Celestial/Obsidian).
*   **Weaknesses:** "God Components" (e.g., Sidebar handling business logic), heavy reliance on global CSS overrides (`@apply`), lack of standardized reusable UI primitives (Buttons, Inputs), and mixed concerns in page layouts.

**Target State:**
*   **Architecture:** Feature-Sliced or Domain-Driven structure (separating Logic from UI).
*   **Design System:** A dedicated UI Component Library (internal) using Tailwind CSS + atomic primitives.
*   **Performance:** Optimized rendering, reduced CSS bundle size, and efficient code splitting.

---

## Phased Approach

### Phase 1: Audit, Inventory & Decoupling (Week 1)
**Goal:** Isolate business logic from UI components and identify all inconsistent visual patterns.

#### 1.1 "God Component" Decomposition
The `Sidebar.tsx` currently manages navigation *and* complex Reconciliation logic.
- [ ] **Action:** Extract Reconciliation logic into a custom hook `useReconciliation()`.
- [ ] **Action:** Create a dedicated component `<ReconciliationWidget />` and move it out of the Sidebar file.
- [ ] **Action:** Make `Sidebar` a pure presentational component that accepts `activeTab` and `onNavigate`.

#### 1.2 Global CSS Audit (`src/index.css`)
The current CSS file uses "magic" `@apply` classes (`.card-island`, `.input-celestial`) which hide Tailwind's utility benefits.
- [ ] **Action:** Audit `src/index.css` to list all custom utility classes.
- [ ] **Action:** Plan to replace `.card-island` with a React Component `<Card />`.
- [ ] **Action:** Plan to replace `.input-celestial` with a React Component `<Input />`.

#### 1.3 Tooling Setup
- [ ] **Install:** `eslint-plugin-jsx-a11y` to catch accessibility issues early.
- [ ] **Install:** `prettier-plugin-tailwindcss` for automatic class sorting (visual consistency).

---

### Phase 2: Design System Foundation (Week 2)
**Goal:** Build the "Lego blocks" of the application to ensure visual harmony and reduce code duplication.

#### 2.1 Establish `src/components/ui`
We will adopt a "Headless" or "Copy-Paste" component architecture (inspired by shadcn/ui) to keep full control over styles.

- [ ] **Button Component:** Create `<Button variant="default | ghost | outline | destructive" size="sm | md | lg" />`.
    - *Benefits:* Centralizes hover states, focus rings, and loading states.
- [ ] **Input Component:** Create `<Input />` that handles error states and labels automatically.
- [ ] **Card Component:** Create `<Card>`, `<CardHeader>`, `<CardContent>` to replace `div.card-island`.
- [ ] **Typography:** Create generic text components or standard class tokens (e.g., `text-h1`, `text-body-muted`) to avoid hardcoded pixel values.

#### 2.2 Standardize Tokens
- [ ] **Refactor:** Move "magic colors" from `index.css` animations into `tailwind.config.js` properly if missing.
- [ ] **Refactor:** Ensure all Z-index values are defined in Tailwind config to avoid `z-10`, `z-20` conflicts.

---

### Phase 3: Structural Refactoring & Cleanup (Week 3)
**Goal:** Rewrite pages using the new Design System components.

#### 3.1 Layout & Navigation
- [ ] **Refactor:** Update `Layout.tsx` to use the new "dumb" `Sidebar` component.
- [ ] **Refactor:** Ensure the `Starfield` background is non-blocking (optimized render).

#### 3.2 Dashboard Refactor
- [ ] **Action:** Replace hardcoded `div.card-island` with `<Card>`.
- [ ] **Action:** Extract the "Trend Analysis" chart into a reusable `<BarChart />` wrapper (even if using custom div-based charts).
- [ ] **Action:** Extract the "Service Analysis" table into a reusable `<Table />` component.

#### 3.3 Form Standardization
- [ ] **Action:** Refactor `ScenarioForms.tsx` to use the new `<Input>`, `<Select>`, and `<Button>` components.
- [ ] **UX:** Implement `react-hook-form` or similar if not already used, to handle validation states consistently (red borders, error messages).

---

### Phase 4: Performance & Optimization (Week 4)
**Goal:** Ensure the app feels "snappy" even with large datasets.

#### 4.1 Rendering Performance
- [ ] **Memoization:** Wrap heavy chart components and the `Starfield` background in `React.memo` to prevent re-renders when Sidebar toggles.
- [ ] **Virtualization:** If the "Transactions" list grows > 100 items, implement `react-window` or `virtua` to virtualize the list.

#### 4.2 Code Splitting
- [ ] **Action:** Implement `React.lazy` and `Suspense` for top-level pages (`Dashboard`, `Transactions`, `Settings`).
    - *Why:* Speeds up the initial launch time of the Electron app.

#### 4.3 Asset Optimization
- [ ] **Action:** Verify standard use of Lucide icons (ensure tree-shaking is working).

---

### Phase 5: Accessibility (a11y) & Responsiveness (Week 5)
**Goal:** Ensure the app is usable by everyone.

#### 5.1 Keyboard Navigation
- [ ] **Audit:** Ensure you can tab through the Sidebar, Forms, and Transactions list without a mouse.
- [ ] **Fix:** Add `focus-visible` styles to all interactive elements (already part of the Phase 2 Button/Input components).

#### 5.2 Screen Reader Support
- [ ] **Action:** Add `aria-label` to icon-only buttons (like the Sidebar toggle).
- [ ] **Action:** Ensure form inputs have associated `<label>` elements (using `htmlFor`).

#### 5.3 Responsive Check
- [ ] **Action:** Verify the "Collapsed Sidebar" mode works on smaller window sizes.
- [ ] **Action:** Ensure tables (Transactions) scroll horizontally on small screens instead of breaking layout.

---

## Tooling Recommendations

| Category | Tool / Library | Usage |
| :--- | :--- | :--- |
| **Styling** | **Tailwind CSS** (Existing) | Keep as core engine. |
| **Components** | **shadcn/ui** (Recommended) | Use as reference for building accessible, styled primitives. |
| **Icons** | **Lucide React** (Existing) | Excellent, keep it. |
| **State** | **Zustand** (Optional) | If React Context becomes too complex for global state. |
| **Linting** | **eslint-plugin-jsx-a11y** | Enforce accessibility rules. |
| **Sorting** | **prettier-plugin-tailwindcss** | Auto-sort class names for readability. |

## Best Practices for the Future

1.  **Avoid `@apply`:** Use utility classes directly in JSX or wrap them in React components. Using `@apply` re-introduces traditional CSS inheritance problems.
2.  **Composition over Inheritance:** Build small components (`<Avatar>`, `<Badge>`) and combine them, rather than making massive "Configurable Cards" with 50 props.
3.  **Colocation:** Keep logic close to where it's used. If a helper function is only used in `Dashboard`, keep it in `Dashboard.tsx` or a `hooks` folder nearby, not in a global `utils` folder.
4.  **Strict Types:** Maintain the rigorous TypeScript standards seen in the backend. Define prop interfaces for *every* component.
