# duan-style Theme Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a duan-style 3-theme (浅色 / 墨黑 / 护眼绿) color switcher to the munger Astro site, with duan's palettes applied site-wide, persisted across visits, and no first-paint flash.

**Architecture:** Redefine munger's existing CSS variables per theme via `<html>` classes (`dark`, `green`), driven by a framework-free, unit-tested `src/lib/theme.ts`. A vanilla-JS `ThemePicker.astro` island reproduces duan's dropdown; an inline head script applies the stored/preferred theme before paint.

**Tech Stack:** Astro 4 (static), TypeScript, Vitest (node env, no DOM), plain CSS custom properties.

## Global Constraints

- No new dependencies; no Vue/Nuxt. Picker is a vanilla-JS Astro island.
- Tests run in Vitest `environment: "node"` — **no real DOM**; `theme.ts` DOM helpers must accept injectable targets.
- Theme names are exactly `"light" | "dark" | "green"`; labels exactly `浅色` / `墨黑` / `护眼绿`; swatch/meta colors exactly light `#f8f5f0`, dark `#1a1a1a`, green `#c0edc6`.
- Applied via `<html>` class: `light` = no class, `dark` = class `dark`, `green` = class `green`.
- Persist to `localStorage['theme']`, wrapped in try/catch; fallback `prefers-color-scheme`.
- `--green*` CSS vars stay aliased to `--orange*` in `:root` only; theme blocks override the concrete `--orange*` (aliases follow via `var()` substitution).
- Standalone reader `public/sources/seeking-wisdom-中文版/reader.html` is OUT OF SCOPE — do not touch.
- `npm run check` must pass at the end.

---

### Task 1: Theme logic module (`src/lib/theme.ts`)

**Files:**
- Create: `src/lib/theme.ts`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Theme = "light" | "dark" | "green"`
  - `const THEMES: readonly Theme[]`
  - `const themeMeta: Record<Theme, { label: string; color: string }>`
  - `const themeMetaColors: Record<Theme, string>`
  - `function isTheme(value: string | null): value is Theme`
  - `function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme`
  - `interface ThemeTargets { root: { classList: { add(t: string): void; remove(t: string): void }; style: { colorScheme: string } }; meta: { setAttribute(name: string, value: string): void } | null }`
  - `function applyTheme(theme: Theme, targets: ThemeTargets): void`

- [ ] **Step 1: Write the failing test**

Create `tests/theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyTheme,
  isTheme,
  resolveInitialTheme,
  THEMES,
  themeMetaColors,
  type ThemeTargets
} from "../src/lib/theme";

function makeTargets() {
  const classes = new Set<string>();
  const style = { colorScheme: "" };
  let metaContent: string | null = null;
  const targets: ThemeTargets = {
    root: {
      classList: {
        add: (t: string) => void classes.add(t),
        remove: (t: string) => void classes.delete(t)
      },
      style
    },
    meta: { setAttribute: (_n: string, v: string) => void (metaContent = v) }
  };
  return { targets, classes, style, meta: () => metaContent };
}

describe("isTheme", () => {
  it("accepts the three known themes", () => {
    expect(THEMES.every((t) => isTheme(t))).toBe(true);
  });
  it("rejects unknown values and null", () => {
    expect(isTheme("warm")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe("resolveInitialTheme", () => {
  it("uses a valid stored theme regardless of system preference", () => {
    expect(resolveInitialTheme("green", false)).toBe("green");
    expect(resolveInitialTheme("green", true)).toBe("green");
  });
  it("falls back to dark when the system prefers dark", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme("nonsense", true)).toBe("dark");
  });
  it("falls back to light otherwise", () => {
    expect(resolveInitialTheme(null, false)).toBe("light");
  });
});

describe("applyTheme", () => {
  it("light clears theme classes and sets a light scheme + meta", () => {
    const { targets, classes, style, meta } = makeTargets();
    targets.root.classList.add("dark");
    applyTheme("light", targets);
    expect(classes.has("dark")).toBe(false);
    expect(classes.has("green")).toBe(false);
    expect(style.colorScheme).toBe("light");
    expect(meta()).toBe(themeMetaColors.light);
  });
  it("dark adds the dark class and a dark scheme", () => {
    const { targets, classes, style, meta } = makeTargets();
    applyTheme("dark", targets);
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("green")).toBe(false);
    expect(style.colorScheme).toBe("dark");
    expect(meta()).toBe(themeMetaColors.dark);
  });
  it("green adds the green class with a light scheme", () => {
    const { targets, classes, style, meta } = makeTargets();
    applyTheme("green", targets);
    expect(classes.has("green")).toBe(true);
    expect(classes.has("dark")).toBe(false);
    expect(style.colorScheme).toBe("light");
    expect(meta()).toBe(themeMetaColors.green);
  });
  it("does not throw when the meta element is absent", () => {
    const { targets } = makeTargets();
    targets.meta = null;
    expect(() => applyTheme("dark", targets)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL — cannot resolve `../src/lib/theme`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/theme.ts`:

```ts
export type Theme = "light" | "dark" | "green";

export const THEMES: readonly Theme[] = ["light", "dark", "green"];

export const themeMeta: Record<Theme, { label: string; color: string }> = {
  light: { label: "浅色", color: "#f8f5f0" },
  dark: { label: "墨黑", color: "#1a1a1a" },
  green: { label: "护眼绿", color: "#c0edc6" }
};

export const themeMetaColors: Record<Theme, string> = {
  light: themeMeta.light.color,
  dark: themeMeta.dark.color,
  green: themeMeta.green.color
};

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "green";
}

export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? "dark" : "light";
}

export interface ThemeTargets {
  root: {
    classList: { add(token: string): void; remove(token: string): void };
    style: { colorScheme: string };
  };
  meta: { setAttribute(name: string, value: string): void } | null;
}

export function applyTheme(theme: Theme, targets: ThemeTargets): void {
  const { root, meta } = targets;
  root.classList.remove("dark");
  root.classList.remove("green");
  if (theme !== "light") root.classList.add(theme);
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
  if (meta) meta.setAttribute("content", themeMetaColors[theme]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts tests/theme.test.ts
git commit -m "feat: add theme logic module for 3-theme switching"
```

---

### Task 2: Palette rewrite + sidebar-header rule (`src/styles/global.css`)

**Files:**
- Modify: `src/styles/global.css` (`:root` block; insert `html.dark`/`html.green`; add `.sidebar-header`)
- Test: `tests/theme-css.test.ts`

**Interfaces:**
- Consumes: nothing (CSS only).
- Produces: `html.dark` / `html.green` theme blocks; `--ease-out` token on `:root`; `.sidebar-header` layout class (used by Task 4).

- [ ] **Step 1: Write the failing test**

Create `tests/theme-css.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/global.css", "utf8");

describe("theme palettes in global.css", () => {
  it("uses duan's light palette on :root", () => {
    expect(css).toContain("--bg: #f8f5f0;");
    expect(css).toContain("--orange: #b5462a;");
  });
  it("defines a dark theme block", () => {
    expect(css).toMatch(/html\.dark\s*\{/);
    expect(css).toContain("--bg: #1a1a1a;");
    expect(css).toContain("color-scheme: dark;");
  });
  it("defines a green theme block", () => {
    expect(css).toMatch(/html\.green\s*\{/);
    expect(css).toContain("--bg: #c0edc6;");
  });
  it("exposes the picker easing token and sidebar header layout", () => {
    expect(css).toContain("--ease-out:");
    expect(css).toContain(".sidebar-header");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme-css.test.ts`
Expected: FAIL — none of the strings present yet.

- [ ] **Step 3a: Rewrite the `:root` color tokens**

In `src/styles/global.css`, replace this exact block:

```css
:root {
  color-scheme: light;
  --bg: #f4f0e8;
  --paper: #fffaf4;
  --paper-soft: #fff5eb;
  --ink: #2f2a24;
  --ink-strong: #241f1a;
  --muted: #7b7268;
  --line: #ead8c3;
  --line-strong: #d9b892e6;
  --orange: #d89138;
  --orange-dark: #a85f18;
  --orange-soft: #fff1da;
  --green: var(--orange);
  --green-dark: var(--orange-dark);
  --green-soft: var(--orange-soft);
  --red: #c84f24;
  --shadow: 0 18px 42px rgb(119 75 32 / 0.1);
```

with:

```css
:root {
  color-scheme: light;
  --bg: #f8f5f0;
  --paper: #ffffff;
  --paper-soft: #f8f5f0;
  --ink: #2c2c2c;
  --ink-strong: #1f1c17;
  --muted: #777777;
  --line: #dddddd;
  --line-strong: #c9c2b8;
  --orange: #b5462a;
  --orange-dark: #9a3a22;
  --orange-soft: rgb(181 70 42 / 0.08);
  --green: var(--orange);
  --green-dark: var(--orange-dark);
  --green-soft: var(--orange-soft);
  --red: #b5462a;
  --shadow: 0 18px 42px rgb(119 75 32 / 0.1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

(The remainder of `:root` — sizes and `font-family` — is unchanged.)

- [ ] **Step 3b: Insert the dark/green theme blocks**

Replace this exact block (end of `:root` through the first reset rule):

```css
  font-family: "Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif;
}

* {
  box-sizing: border-box;
}
```

with:

```css
  font-family: "Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif;
}

html.dark {
  color-scheme: dark;
  --bg: #1a1a1a;
  --paper: #222222;
  --paper-soft: #1f1f1f;
  --ink: #e5e5e5;
  --ink-strong: #f2f2f2;
  --muted: #999999;
  --line: #333333;
  --line-strong: #444444;
  --orange: #e07a5a;
  --orange-dark: #e8917a;
  --orange-soft: rgb(224 122 90 / 0.1);
  --red: #e07a5a;
  --shadow: 0 18px 42px rgb(0 0 0 / 0.5);
}

html.green {
  color-scheme: light;
  --bg: #c0edc6;
  --paper: #d2f1d7;
  --paper-soft: #cbeecf;
  --ink: #20231f;
  --ink-strong: #171a16;
  --muted: #4d6253;
  --line: #8faf97;
  --line-strong: #7a9a82;
  --orange: #8f3d2c;
  --orange-dark: #7a3325;
  --orange-soft: rgb(143 61 44 / 0.1);
  --red: #8f3d2c;
  --shadow: 0 18px 42px rgb(24 34 27 / 0.18);
}

* {
  box-sizing: border-box;
}
```

(`--green*` are NOT redefined here — they stay aliased to `--orange*` from `:root` and follow via `var()` substitution.)

- [ ] **Step 3c: Add the `.sidebar-header` layout rule**

Replace this exact block:

```css
.site-brand {
  display: block;
  color: var(--green-dark);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0;
}
```

with:

```css
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.site-brand {
  display: block;
  color: var(--green-dark);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css tests/theme-css.test.ts
git commit -m "feat: adopt duan's three theme palettes in global.css"
```

---

### Task 3: ThemePicker component (`src/components/ThemePicker.astro`)

**Files:**
- Create: `src/components/ThemePicker.astro`
- Test: `tests/theme-picker.test.ts`

**Interfaces:**
- Consumes: `THEMES`, `themeMeta`, `applyTheme`, `isTheme`, `type Theme`, `type ThemeTargets` from `src/lib/theme.ts`.
- Produces: an Astro component accepting `placement?: "top-start" | "bottom-end"` (default `"bottom-end"`), rendering `[data-theme-picker]` with `[data-theme-option][data-theme-value]` buttons and wiring theme selection + persistence on the client.

- [ ] **Step 1: Write the failing test**

Create `tests/theme-picker.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/components/ThemePicker.astro", "utf8");

describe("ThemePicker component", () => {
  it("imports the shared theme module", () => {
    expect(src).toContain('from "../lib/theme"');
  });
  it("renders an accessible menu with radio options", () => {
    expect(src).toContain('aria-haspopup="menu"');
    expect(src).toContain('role="menu"');
    expect(src).toContain('role="menuitemradio"');
  });
  it("tags the picker root and each option's theme value", () => {
    expect(src).toContain("data-theme-picker");
    expect(src).toContain("data-theme-value");
  });
  it("applies and persists the selected theme on the client", () => {
    expect(src).toContain("applyTheme(");
    expect(src).toContain('localStorage.setItem("theme"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme-picker.test.ts`
Expected: FAIL — `ENOENT` reading `src/components/ThemePicker.astro`.

- [ ] **Step 3: Create the component**

Create `src/components/ThemePicker.astro`:

```astro
---
import { THEMES, themeMeta } from "../lib/theme";

interface Props {
  placement?: "top-start" | "bottom-end";
}

const placement = Astro.props.placement ?? "bottom-end";
const options = THEMES.map((value) => ({ value, ...themeMeta[value] }));
const menuId = `theme-menu-${Math.random().toString(36).slice(2, 8)}`;
---

<div class="theme-picker" data-theme-picker data-placement={placement}>
  <button
    class="theme-trigger"
    type="button"
    aria-haspopup="menu"
    aria-expanded="false"
    aria-controls={menuId}
    aria-label="选择主题"
    title="选择主题"
    data-theme-trigger
  >
    <span class="theme-trigger-swatch" aria-hidden="true" data-theme-trigger-swatch></span>
    <svg class="theme-trigger-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  <div id={menuId} class="theme-menu" role="menu" aria-label="选择主题" hidden data-theme-menu>
    {options.map((option) => (
      <button
        class="theme-option"
        type="button"
        role="menuitemradio"
        aria-checked="false"
        tabindex="-1"
        data-theme-option
        data-theme-value={option.value}
      >
        <span class="theme-option-swatch" aria-hidden="true" style={`background:${option.color}`}></span>
        <span class="theme-option-label">{option.label}</span>
        <svg class="theme-option-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden data-theme-check>
          <path d="m20 6-11 11-5-5" />
        </svg>
      </button>
    ))}
  </div>
</div>

<style>
  .theme-picker {
    position: relative;
    display: inline-flex;
  }

  .theme-trigger {
    display: grid;
    grid-template-columns: 18px 12px;
    place-items: center;
    gap: 2px;
    width: 40px;
    height: 40px;
    padding: 0 4px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--paper);
    color: var(--muted);
    cursor: pointer;
    transition: color 0.2s var(--ease-out), border-color 0.2s var(--ease-out), background 0.2s var(--ease-out);
  }

  .theme-trigger:hover,
  .theme-trigger[aria-expanded="true"] {
    border-color: var(--orange);
    background: var(--green-soft);
    color: var(--ink);
  }

  .theme-trigger:focus-visible,
  .theme-option:focus-visible {
    outline: 2px solid var(--orange);
    outline-offset: 2px;
  }

  .theme-trigger-swatch,
  .theme-option-swatch {
    display: block;
    border: 1px solid rgb(0 0 0 / 0.18);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.22);
  }

  .theme-trigger-swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
  }

  .theme-trigger-chevron {
    transition: transform 0.2s var(--ease-out);
  }

  .theme-trigger[aria-expanded="true"] .theme-trigger-chevron {
    transform: rotate(180deg);
  }

  .theme-menu {
    position: absolute;
    z-index: 80;
    width: 172px;
    padding: 6px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow);
  }

  .theme-picker[data-placement="top-start"] .theme-menu {
    bottom: calc(100% + 8px);
    left: 0;
  }

  .theme-picker[data-placement="bottom-end"] .theme-menu {
    top: calc(100% + 8px);
    right: 0;
  }

  .theme-option {
    display: grid;
    grid-template-columns: 20px 1fr 18px;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 40px;
    padding: 7px 9px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    font: 500 13px/1.2 ui-sans-serif, system-ui, sans-serif;
    text-align: left;
    cursor: pointer;
  }

  .theme-option:hover,
  .theme-option:focus-visible {
    background: var(--green-soft);
    color: var(--ink);
  }

  .theme-option[aria-checked="true"] {
    color: var(--orange-dark);
    font-weight: 700;
  }

  .theme-option-swatch {
    width: 18px;
    height: 18px;
    border-radius: 4px;
  }

  .theme-option-check {
    justify-self: end;
  }

  @media (prefers-reduced-motion: reduce) {
    .theme-trigger,
    .theme-trigger-chevron {
      transition: none;
    }
  }
</style>

<script>
  import { applyTheme, isTheme, themeMeta, type Theme, type ThemeTargets } from "../lib/theme";

  function currentTargets(): ThemeTargets {
    return {
      root: document.documentElement,
      meta: document.querySelector('meta[name="theme-color"]')
    };
  }

  function readCurrentTheme(): Theme {
    const root = document.documentElement;
    if (root.classList.contains("dark")) return "dark";
    if (root.classList.contains("green")) return "green";
    return "light";
  }

  function persist(theme: Theme) {
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Storage may be blocked; the choice still applies to the current page.
    }
  }

  function setup(picker: HTMLElement) {
    const trigger = picker.querySelector<HTMLButtonElement>("[data-theme-trigger]");
    const menu = picker.querySelector<HTMLElement>("[data-theme-menu]");
    const swatch = picker.querySelector<HTMLElement>("[data-theme-trigger-swatch]");
    const options = Array.from(picker.querySelectorAll<HTMLButtonElement>("[data-theme-option]"));
    if (!trigger || !menu || !swatch) return;

    let open = false;

    const syncUi = (theme: Theme) => {
      swatch.style.background = themeMeta[theme].color;
      for (const option of options) {
        const value = option.dataset.themeValue ?? null;
        const active = isTheme(value) && value === theme;
        option.setAttribute("aria-checked", active ? "true" : "false");
        option.tabIndex = active ? 0 : -1;
        const check = option.querySelector<SVGElement>("[data-theme-check]");
        if (check) check.hidden = !active;
      }
    };

    const openMenu = () => {
      open = true;
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      const active = options.find((o) => o.getAttribute("aria-checked") === "true") ?? options[0];
      active?.focus();
    };

    const closeMenu = (restoreFocus = false) => {
      open = false;
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    };

    const select = (theme: Theme) => {
      applyTheme(theme, currentTargets());
      persist(theme);
      syncUi(theme);
      closeMenu(true);
    };

    trigger.addEventListener("click", () => (open ? closeMenu() : openMenu()));

    for (const option of options) {
      option.addEventListener("click", () => {
        const value = option.dataset.themeValue ?? null;
        if (isTheme(value)) select(value);
      });
    }

    menu.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        closeMenu();
        return;
      }
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      let next = index;
      if (event.key === "ArrowDown") next = (Math.max(index, -1) + 1) % options.length;
      else if (event.key === "ArrowUp") next = (index <= 0 ? options.length : index) - 1;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = options.length - 1;
      else return;
      event.preventDefault();
      options[next]?.focus();
    });

    picker.addEventListener("focusout", (event) => {
      const next = event.relatedTarget;
      if (open && (!(next instanceof Node) || !picker.contains(next))) closeMenu();
    });

    document.addEventListener("pointerdown", (event) => {
      if (open && !picker.contains(event.target as Node)) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    });

    syncUi(readCurrentTheme());
  }

  for (const picker of document.querySelectorAll<HTMLElement>("[data-theme-picker]")) {
    setup(picker);
  }
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme-picker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemePicker.astro tests/theme-picker.test.ts
git commit -m "feat: add duan-style ThemePicker component"
```

---

### Task 4: Wire into BaseLayout + no-flash + verification (`src/layouts/BaseLayout.astro`)

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (frontmatter import; head meta + inline script; sidebar brand row)

**Interfaces:**
- Consumes: `ThemePicker.astro` (Task 3); `.sidebar-header` class (Task 2).
- Produces: theme-switching wired site-wide with pre-paint theme application.

- [ ] **Step 1: Import the component**

In `src/layouts/BaseLayout.astro` frontmatter, add after the `absoluteUrl, canonicalUrl` import line:

```astro
import ThemePicker from "../components/ThemePicker.astro";
```

- [ ] **Step 2: Update the default theme-color meta**

Replace:

```astro
    <meta name="theme-color" content="#f4f0e8" />
```

with:

```astro
    <meta name="theme-color" content="#f8f5f0" />
```

- [ ] **Step 3: Add the inline no-flash head script**

Immediately AFTER the `<meta name="theme-color" content="#f8f5f0" />` line, insert:

```astro
    <script is:inline>
      (function () {
        try {
          var stored = null;
          try {
            stored = localStorage.getItem("theme");
          } catch (e) {}
          var valid = stored === "light" || stored === "dark" || stored === "green";
          var theme = valid
            ? stored
            : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light";
          var root = document.documentElement;
          root.classList.remove("dark", "green");
          if (theme !== "light") root.classList.add(theme);
          root.style.colorScheme = theme === "dark" ? "dark" : "light";
          var colors = { light: "#f8f5f0", dark: "#1a1a1a", green: "#c0edc6" };
          var meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.setAttribute("content", colors[theme]);
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 4: Place the picker in the sidebar header**

Replace:

```astro
      <aside class="archive-sidebar" aria-label="知识库导航">
        <a class="site-brand" href="/">{SITE_TITLE}</a>
        <p class="sidebar-tagline">慢慢读，反复看，用原文校准判断。</p>
```

with:

```astro
      <aside class="archive-sidebar" aria-label="知识库导航">
        <div class="sidebar-header">
          <a class="site-brand" href="/">{SITE_TITLE}</a>
          <ThemePicker placement="bottom-end" />
        </div>
        <p class="sidebar-tagline">慢慢读，反复看，用原文校准判断。</p>
```

- [ ] **Step 5: Full gate**

Run: `npm run check`
Expected: validate:content, `astro check` (0 errors), vitest (all pass incl. the 3 new files and the untouched `seeking-wisdom-reader` test), and `astro build` all succeed.

- [ ] **Step 6: Browser verification**

- `preview_start { name: "dev" }` (add `.claude/launch.json` with an `npm run dev` config on its port if absent), open `/`.
- Open the picker, select each theme; after each: `read_page`/`javascript_tool` to confirm `document.documentElement.className` is `""` / `dark` / `green`, and `getComputedStyle(document.body).backgroundColor` matches the theme bg.
- Confirm `localStorage.theme` is set; reload and confirm the theme persists with no light flash.
- `screenshot` in dark and green to attach as proof.

- [ ] **Step 7: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: wire theme switcher into BaseLayout with no-flash init"
```

---

## Self-Review

**Spec coverage:**
- Palette (spec §1) → Task 2 (table values match spec exactly; `--ease-out` added; `--green*` aliasing preserved). ✓
- Logic `theme.ts` (spec §2) → Task 1 (signatures match spec). ✓
- `ThemePicker.astro` (spec §3) → Task 3 (markup, scoped munger-token CSS, client script, `placement` prop). ✓
- No-flash + placement + default meta (spec §4) → Task 4 (inline script, `#f8f5f0` meta, `.sidebar-header` row). ✓
- Testing (spec §5) → `tests/theme.test.ts`, `tests/theme-css.test.ts`, `tests/theme-picker.test.ts`, `npm run check`, browser verify. ✓
- Non-goal: standalone reader untouched → no task modifies it. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `Theme`, `THEMES`, `themeMeta`, `themeMetaColors`, `isTheme`, `resolveInitialTheme`, `applyTheme`, `ThemeTargets` used identically across Tasks 1/3. Component data hooks (`data-theme-picker`, `data-theme-trigger`, `data-theme-menu`, `data-theme-trigger-swatch`, `data-theme-option`, `data-theme-value`, `data-theme-check`) are defined in Task 3 markup and read by the same task's script. ✓
