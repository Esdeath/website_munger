# duan-style Article Font-Size Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a duan-style article font-size control to munger that scales the article body prose across 5 levels (90–130%), persisted across visits.

**Architecture:** Port duan's pure, DOM-injectable font-size utility to `src/lib/font-size.ts` (node-testable); hook `.article-body` to a new `--article-font-scale` CSS variable; build a vanilla-JS Astro picker (`FontSizePicker.astro`) modeled on the existing `ThemePicker.astro`; wire it into the global `.sidebar-header` next to `ThemePicker`, with an inline pre-paint no-flash script in `BaseLayout.astro`.

**Tech Stack:** Astro 4 (static), TypeScript (strict), Vitest (node env, no DOM), plain CSS custom properties.

## Global Constraints

- Levels are exactly `[90, 100, 110, 120, 130]`; default `100`; localStorage key `"article-font-size-percent"`. Copy these verbatim.
- The scale is applied by setting the CSS custom property `--article-font-scale` to `"<percent>%"` on `document.documentElement`, consumed by `.article-body { font-size: var(--article-font-scale); }`. Scope is article body prose only — no other font sizes change.
- Follow the established theme-feature pattern: pure logic in `src/lib`, an Astro island picker, an inline `is:inline` no-flash script in `BaseLayout.astro`, node-only unit tests (no DOM). Mirror `ThemePicker.astro` conventions (data-attributes, `hidden`-toggled panel, multi-instance `setup()` loop, munger CSS tokens `--paper`/`--line`/`--ink`/`--muted`/`--orange`/`--green-soft`/`--orange-dark`/`--shadow`/`--ease-out`).
- All `localStorage` access is wrapped in try/catch; the CSS `:root` default (100%) remains usable when storage is blocked.
- The canonical gate is `npm run check` (validate:content + astro check + vitest run + astro build). It must stay green.
- Commit directly on branch `feat/duan-font-size`. One commit per task. Do not run git beyond the commit steps shown.

---

### Task 1: Font-size logic module

**Files:**
- Create: `src/lib/font-size.ts`
- Test: `tests/font-size.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ARTICLE_FONT_SIZE_LEVELS: readonly [90, 100, 110, 120, 130]`
  - `ARTICLE_FONT_SIZE_DEFAULT: number` (100)
  - `ARTICLE_FONT_SIZE_STORAGE_KEY: string` (`"article-font-size-percent"`)
  - `normalizeArticleFontSizePercent(value: unknown): number`
  - `stepArticleFontSizePercent(value: unknown, direction: -1 | 1): number`
  - `loadArticleFontSizePercent(storage: { getItem(k: string): string | null }): number`
  - `applyArticleFontSizePercent(style: { setProperty(p: string, v: string): void }, value: unknown): number`
  - `saveArticleFontSizePercent(storage: { setItem(k: string, v: string): void }, style: { setProperty(p: string, v: string): void }, value: unknown): number`

- [ ] **Step 1: Write the failing test**

Create `tests/font-size.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ARTICLE_FONT_SIZE_DEFAULT,
  ARTICLE_FONT_SIZE_LEVELS,
  ARTICLE_FONT_SIZE_STORAGE_KEY,
  applyArticleFontSizePercent,
  loadArticleFontSizePercent,
  normalizeArticleFontSizePercent,
  saveArticleFontSizePercent,
  stepArticleFontSizePercent
} from "../src/lib/font-size";

describe("constants", () => {
  it("defines duan's levels, default, and storage key", () => {
    expect([...ARTICLE_FONT_SIZE_LEVELS]).toEqual([90, 100, 110, 120, 130]);
    expect(ARTICLE_FONT_SIZE_DEFAULT).toBe(100);
    expect(ARTICLE_FONT_SIZE_STORAGE_KEY).toBe("article-font-size-percent");
  });
});

describe("normalizeArticleFontSizePercent", () => {
  it("passes through every valid level", () => {
    for (const level of ARTICLE_FONT_SIZE_LEVELS) {
      expect(normalizeArticleFontSizePercent(level)).toBe(level);
    }
  });
  it("parses numeric strings", () => {
    expect(normalizeArticleFontSizePercent("120")).toBe(120);
  });
  it("falls back to the default for junk, out-of-range, and null", () => {
    expect(normalizeArticleFontSizePercent("abc")).toBe(ARTICLE_FONT_SIZE_DEFAULT);
    expect(normalizeArticleFontSizePercent(85)).toBe(ARTICLE_FONT_SIZE_DEFAULT);
    expect(normalizeArticleFontSizePercent(200)).toBe(ARTICLE_FONT_SIZE_DEFAULT);
    expect(normalizeArticleFontSizePercent(null)).toBe(ARTICLE_FONT_SIZE_DEFAULT);
  });
});

describe("stepArticleFontSizePercent", () => {
  it("moves one level in each direction", () => {
    expect(stepArticleFontSizePercent(100, 1)).toBe(110);
    expect(stepArticleFontSizePercent(100, -1)).toBe(90);
  });
  it("clamps at the minimum", () => {
    expect(stepArticleFontSizePercent(90, -1)).toBe(90);
  });
  it("clamps at the maximum", () => {
    expect(stepArticleFontSizePercent(130, 1)).toBe(130);
  });
  it("normalizes junk before stepping", () => {
    expect(stepArticleFontSizePercent("nonsense", 1)).toBe(110);
  });
});

describe("loadArticleFontSizePercent", () => {
  it("reads and normalizes from the storage key", () => {
    const store = new Map([[ARTICLE_FONT_SIZE_STORAGE_KEY, "120"]]);
    const storage = { getItem: (k: string) => store.get(k) ?? null };
    expect(loadArticleFontSizePercent(storage)).toBe(120);
  });
  it("defaults when the key is absent", () => {
    const storage = { getItem: () => null };
    expect(loadArticleFontSizePercent(storage)).toBe(ARTICLE_FONT_SIZE_DEFAULT);
  });
});

describe("applyArticleFontSizePercent", () => {
  it("sets the CSS variable to '<n>%' and returns the normalized number", () => {
    const calls: Array<[string, string]> = [];
    const style = { setProperty: (p: string, v: string) => void calls.push([p, v]) };
    expect(applyArticleFontSizePercent(style, 130)).toBe(130);
    expect(calls).toEqual([["--article-font-scale", "130%"]]);
  });
  it("normalizes before applying", () => {
    const calls: Array<[string, string]> = [];
    const style = { setProperty: (p: string, v: string) => void calls.push([p, v]) };
    applyArticleFontSizePercent(style, 999);
    expect(calls).toEqual([["--article-font-scale", "100%"]]);
  });
});

describe("saveArticleFontSizePercent", () => {
  it("applies the variable and writes String(normalized) to storage", () => {
    const styleCalls: Array<[string, string]> = [];
    const setCalls: Array<[string, string]> = [];
    const style = { setProperty: (p: string, v: string) => void styleCalls.push([p, v]) };
    const storage = { setItem: (k: string, v: string) => void setCalls.push([k, v]) };
    expect(saveArticleFontSizePercent(storage, style, 110)).toBe(110);
    expect(styleCalls).toEqual([["--article-font-scale", "110%"]]);
    expect(setCalls).toEqual([[ARTICLE_FONT_SIZE_STORAGE_KEY, "110"]]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/font-size.test.ts`
Expected: FAIL — cannot resolve `../src/lib/font-size`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/font-size.ts`:

```ts
export const ARTICLE_FONT_SIZE_LEVELS = [90, 100, 110, 120, 130] as const;
export const ARTICLE_FONT_SIZE_DEFAULT = 100;
export const ARTICLE_FONT_SIZE_STORAGE_KEY = "article-font-size-percent";

type FontSizeLevel = (typeof ARTICLE_FONT_SIZE_LEVELS)[number];
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type StyleLike = Pick<CSSStyleDeclaration, "setProperty">;

function isLevel(value: number): value is FontSizeLevel {
  return (ARTICLE_FONT_SIZE_LEVELS as readonly number[]).includes(value);
}

export function normalizeArticleFontSizePercent(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return isLevel(parsed) ? parsed : ARTICLE_FONT_SIZE_DEFAULT;
}

export function stepArticleFontSizePercent(value: unknown, direction: -1 | 1): number {
  const current = normalizeArticleFontSizePercent(value);
  const currentIndex = ARTICLE_FONT_SIZE_LEVELS.indexOf(current as FontSizeLevel);
  const nextIndex = Math.min(
    ARTICLE_FONT_SIZE_LEVELS.length - 1,
    Math.max(0, currentIndex + direction)
  );
  return ARTICLE_FONT_SIZE_LEVELS[nextIndex] ?? ARTICLE_FONT_SIZE_DEFAULT;
}

export function loadArticleFontSizePercent(storage: Pick<StorageLike, "getItem">): number {
  return normalizeArticleFontSizePercent(storage.getItem(ARTICLE_FONT_SIZE_STORAGE_KEY));
}

export function applyArticleFontSizePercent(style: StyleLike, value: unknown): number {
  const normalized = normalizeArticleFontSizePercent(value);
  style.setProperty("--article-font-scale", `${normalized}%`);
  return normalized;
}

export function saveArticleFontSizePercent(
  storage: Pick<StorageLike, "setItem">,
  style: StyleLike,
  value: unknown
): number {
  const normalized = applyArticleFontSizePercent(style, value);
  storage.setItem(ARTICLE_FONT_SIZE_STORAGE_KEY, String(normalized));
  return normalized;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/font-size.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Typecheck**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/font-size.ts tests/font-size.test.ts
git commit -m "feat: add article font-size logic module"
```

---

### Task 2: CSS hook on `.article-body`

**Files:**
- Modify: `src/styles/global.css` (`:root` block ~line 49; `.article-body` block ~line 671)
- Test: `tests/font-size-css.test.ts`

**Interfaces:**
- Consumes: nothing (CSS only).
- Produces: the `--article-font-scale` custom property (default `100%`) that Task 1's `applyArticleFontSizePercent` writes and `.article-body` reads.

- [ ] **Step 1: Write the failing test**

Create `tests/font-size-css.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/global.css", "utf8");

describe("article font-size scaling in global.css", () => {
  it("declares --article-font-scale at 100% on :root", () => {
    expect(css).toMatch(/:root\s*\{[^}]*--article-font-scale:\s*100%;/s);
  });
  it("scales .article-body from the variable", () => {
    expect(css).toMatch(/\.article-body\s*\{[^}]*font-size:\s*var\(--article-font-scale\);/s);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/font-size-css.test.ts`
Expected: FAIL — neither pattern present yet.

- [ ] **Step 3: Add the `:root` variable**

In `src/styles/global.css`, find this line inside `:root`:

```css
  --fs-hero-max: 3.2rem;
```

Add a line immediately after it:

```css
  --fs-hero-max: 3.2rem;
  --article-font-scale: 100%;
```

- [ ] **Step 4: Hook `.article-body` to the variable**

In `src/styles/global.css`, replace the opening of the `.article-body` rule:

```css
.article-body {
  max-width: 980px;
  color: var(--ink);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.75;
}
```

with:

```css
.article-body {
  max-width: 980px;
  color: var(--ink);
  font-size: var(--article-font-scale);
  font-weight: 400;
  line-height: 1.75;
}
```

(Only the `font-size` line changes. Do not touch the `.article-body p { font-size: 1em; }` or heading `em` rules — they scale relative to this.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/font-size-css.test.ts`
Expected: PASS (both cases).

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css tests/font-size-css.test.ts
git commit -m "feat: scale .article-body from --article-font-scale variable"
```

---

### Task 3: FontSizePicker component

**Files:**
- Create: `src/components/FontSizePicker.astro`

**Interfaces:**
- Consumes: `src/lib/font-size.ts` (`ARTICLE_FONT_SIZE_DEFAULT`, `ARTICLE_FONT_SIZE_LEVELS`, `applyArticleFontSizePercent`, `loadArticleFontSizePercent`, `saveArticleFontSizePercent`, `stepArticleFontSizePercent`).
- Produces: `<FontSizePicker placement="top-start" | "bottom-end" />` (default `"bottom-end"`), a self-contained island with root attribute `data-font-picker`. Consumed by Task 4.

Note on verification: this component is not rendered by any page until Task 4, so its client `<script>` is typechecked by `astro check` but not yet browser-exercised. Browser verification happens in Task 4.

- [ ] **Step 1: Create the component**

Create `src/components/FontSizePicker.astro`:

```astro
---
interface Props {
  placement?: "top-start" | "bottom-end";
}

const placement = Astro.props.placement ?? "bottom-end";
const panelId = `font-size-panel-${Math.random().toString(36).slice(2, 8)}`;
---

<div class="font-size-picker" data-font-picker data-placement={placement}>
  <button
    class="font-size-trigger"
    type="button"
    aria-haspopup="dialog"
    aria-expanded="false"
    aria-controls={panelId}
    aria-label="调整正文字号"
    title="调整正文字号"
    data-font-trigger
  >
    <span class="font-size-glyph" aria-hidden="true"><strong>A</strong><small>a</small></span>
    <svg class="font-size-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  <div id={panelId} class="font-size-panel" role="dialog" aria-label="调整正文字号" hidden data-font-panel>
    <span class="font-size-label">正文字号</span>
    <div class="font-size-controls" role="group" aria-label="正文字号">
      <button type="button" aria-label="减小正文字号" data-font-decrease>A−</button>
      <button class="font-size-value" type="button" aria-label="恢复默认正文字号" data-font-reset>100%</button>
      <button type="button" aria-label="增大正文字号" data-font-increase>A+</button>
    </div>
    <span class="visually-hidden" aria-live="polite" data-font-live></span>
  </div>
</div>

<style>
  .font-size-picker {
    position: relative;
    display: inline-flex;
  }

  .font-size-trigger {
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

  .font-size-trigger:hover,
  .font-size-trigger[aria-expanded="true"] {
    border-color: var(--orange);
    background: var(--green-soft);
    color: var(--ink);
  }

  .font-size-trigger:focus-visible,
  .font-size-controls button:focus-visible {
    outline: 2px solid var(--orange);
    outline-offset: 2px;
  }

  .font-size-glyph {
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    width: 18px;
    font-family: ui-sans-serif, system-ui, sans-serif;
    line-height: 1;
  }

  .font-size-glyph strong {
    font-size: 15px;
    font-weight: 700;
  }

  .font-size-glyph small {
    font-size: 9px;
    font-weight: 700;
  }

  .font-size-chevron {
    transition: transform 0.2s var(--ease-out);
  }

  .font-size-trigger[aria-expanded="true"] .font-size-chevron {
    transform: rotate(180deg);
  }

  .font-size-panel {
    position: absolute;
    z-index: 80;
    width: 172px;
    padding: 9px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow);
  }

  .font-size-picker[data-placement="top-start"] .font-size-panel {
    bottom: calc(100% + 8px);
    left: 0;
  }

  .font-size-picker[data-placement="bottom-end"] .font-size-panel {
    top: calc(100% + 8px);
    right: 0;
  }

  .font-size-label {
    display: block;
    margin: 1px 2px 8px;
    color: var(--muted);
    font: 600 12px/1.4 ui-sans-serif, system-ui, sans-serif;
  }

  .font-size-controls {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .font-size-controls button {
    min-width: 0;
    height: 40px;
    padding: 0;
    border: 0;
    border-right: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    font: 600 13px/1.2 ui-sans-serif, system-ui, sans-serif;
    cursor: pointer;
  }

  .font-size-controls button:last-child {
    border-right: 0;
  }

  .font-size-controls button:hover:not(:disabled),
  .font-size-controls button:focus-visible {
    background: var(--green-soft);
    color: var(--ink);
  }

  .font-size-controls button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .font-size-controls .font-size-value {
    color: var(--orange-dark);
    font-variant-numeric: tabular-nums;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .font-size-trigger,
    .font-size-chevron {
      transition: none;
    }
  }
</style>

<script>
  import {
    ARTICLE_FONT_SIZE_DEFAULT,
    ARTICLE_FONT_SIZE_LEVELS,
    applyArticleFontSizePercent,
    loadArticleFontSizePercent,
    saveArticleFontSizePercent,
    stepArticleFontSizePercent
  } from "../lib/font-size";

  const MIN = ARTICLE_FONT_SIZE_LEVELS[0];
  const MAX = ARTICLE_FONT_SIZE_LEVELS.at(-1) ?? ARTICLE_FONT_SIZE_DEFAULT;

  function setup(picker: HTMLElement) {
    const trigger = picker.querySelector<HTMLButtonElement>("[data-font-trigger]");
    const panel = picker.querySelector<HTMLElement>("[data-font-panel]");
    const decreaseBtn = picker.querySelector<HTMLButtonElement>("[data-font-decrease]");
    const increaseBtn = picker.querySelector<HTMLButtonElement>("[data-font-increase]");
    const resetBtn = picker.querySelector<HTMLButtonElement>("[data-font-reset]");
    const live = picker.querySelector<HTMLElement>("[data-font-live]");
    if (!trigger || !panel || !decreaseBtn || !increaseBtn || !resetBtn) return;

    const style = document.documentElement.style;
    let open = false;
    let percent = ARTICLE_FONT_SIZE_DEFAULT;

    const syncUi = () => {
      resetBtn.textContent = `${percent}%`;
      decreaseBtn.disabled = percent <= MIN;
      increaseBtn.disabled = percent >= MAX;
      trigger.title = `调整正文字号，当前 ${percent}%`;
      if (live) live.textContent = `当前正文字号 ${percent}%`;
    };

    const commit = (value: number) => {
      try {
        percent = saveArticleFontSizePercent(localStorage, style, value);
      } catch {
        percent = applyArticleFontSizePercent(style, value);
      }
      syncUi();
    };

    const openPanel = () => {
      open = true;
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      resetBtn.focus();
    };

    const closePanel = (restoreFocus = false) => {
      open = false;
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    };

    trigger.addEventListener("click", () => (open ? closePanel() : openPanel()));
    decreaseBtn.addEventListener("click", () => commit(stepArticleFontSizePercent(percent, -1)));
    increaseBtn.addEventListener("click", () => commit(stepArticleFontSizePercent(percent, 1)));
    resetBtn.addEventListener("click", () => commit(ARTICLE_FONT_SIZE_DEFAULT));

    panel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        commit(stepArticleFontSizePercent(percent, -1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        commit(stepArticleFontSizePercent(percent, 1));
      } else if (event.key === "Home") {
        event.preventDefault();
        commit(ARTICLE_FONT_SIZE_DEFAULT);
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (open && !picker.contains(event.target as Node)) closePanel();
    });

    document.addEventListener("keydown", (event) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        closePanel(true);
      }
    });

    // Initial load: apply the stored value (no write), then sync the UI.
    try {
      percent = applyArticleFontSizePercent(style, loadArticleFontSizePercent(localStorage));
    } catch {
      percent = applyArticleFontSizePercent(style, ARTICLE_FONT_SIZE_DEFAULT);
    }
    syncUi();
  }

  for (const picker of document.querySelectorAll<HTMLElement>("[data-font-picker]")) {
    setup(picker);
  }
</script>
```

- [ ] **Step 2: Typecheck the component**

Run: `npx astro check`
Expected: 0 errors (the `<script>` imports resolve and typecheck).

- [ ] **Step 3: Commit**

```bash
git add src/components/FontSizePicker.astro
git commit -m "feat: add duan-style FontSizePicker component"
```

---

### Task 4: Wire picker into BaseLayout + no-flash script

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (import ~line 13; inline head script ~line 61–83; `.sidebar-header` ~line 123–126)
- Modify: `src/styles/global.css` (add `.sidebar-tools` after the `.sidebar-header` rule, ~line 196)
- Test: `tests/font-size-noflash-sync.test.ts`

**Interfaces:**
- Consumes: `FontSizePicker.astro` (Task 3); `src/lib/font-size.ts` constants (Task 1) for the drift test.
- Produces: the fully wired feature.

- [ ] **Step 1: Write the failing drift-guard test**

Create `tests/font-size-noflash-sync.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ARTICLE_FONT_SIZE_DEFAULT,
  ARTICLE_FONT_SIZE_LEVELS,
  ARTICLE_FONT_SIZE_STORAGE_KEY
} from "../src/lib/font-size";

// The inline `is:inline` no-flash script in BaseLayout cannot import font-size.ts
// (it must run before any module loads), so it duplicates the levels/key/default.
// These tests guard that duplication against drift from the canonical source.
const layout = readFileSync("src/layouts/BaseLayout.astro", "utf8");

describe("BaseLayout no-flash font-size script stays in sync with font-size.ts", () => {
  it("reads the canonical storage key", () => {
    expect(layout).toContain(ARTICLE_FONT_SIZE_STORAGE_KEY);
  });
  it("embeds the full level list", () => {
    expect(layout).toContain(`[${[...ARTICLE_FONT_SIZE_LEVELS].join(", ")}]`);
  });
  it("embeds the default percent", () => {
    expect(layout).toMatch(new RegExp(`DEFAULT\\s*=\\s*${ARTICLE_FONT_SIZE_DEFAULT}`));
  });
  it("sets the --article-font-scale custom property before paint", () => {
    expect(layout).toContain('setProperty("--article-font-scale"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/font-size-noflash-sync.test.ts`
Expected: FAIL — BaseLayout has no font-size no-flash script yet.

- [ ] **Step 3: Import the component**

In `src/layouts/BaseLayout.astro`, find:

```astro
import ThemePicker from "../components/ThemePicker.astro";
```

Add immediately after:

```astro
import ThemePicker from "../components/ThemePicker.astro";
import FontSizePicker from "../components/FontSizePicker.astro";
```

- [ ] **Step 4: Add the inline no-flash font-size script**

In `src/layouts/BaseLayout.astro`, find the end of the existing theme no-flash IIFE (the `</script>` that closes the block starting `(function () {` ... theme-color logic). It ends with:

```astro
        } catch (e) {}
      })();
    </script>
```

Insert a new inline script immediately after that `</script>`:

```astro
    <script is:inline>
      (function () {
        try {
          var LEVELS = [90, 100, 110, 120, 130];
          var DEFAULT = 100;
          var raw = null;
          try {
            raw = localStorage.getItem("article-font-size-percent");
          } catch (e) {}
          var parsed = Number(raw);
          var percent = LEVELS.indexOf(parsed) !== -1 ? parsed : DEFAULT;
          document.documentElement.style.setProperty("--article-font-scale", percent + "%");
        } catch (e) {}
      })();
    </script>
```

(Keep the array literal exactly `[90, 100, 110, 120, 130]` and `var DEFAULT = 100;` — the drift test asserts this formatting.)

- [ ] **Step 5: Add the picker to the sidebar header**

In `src/layouts/BaseLayout.astro`, find:

```astro
        <div class="sidebar-header">
          <a class="site-brand" href="/">{SITE_TITLE}</a>
          <ThemePicker placement="bottom-end" />
        </div>
```

Replace with:

```astro
        <div class="sidebar-header">
          <a class="site-brand" href="/">{SITE_TITLE}</a>
          <div class="sidebar-tools">
            <FontSizePicker placement="bottom-end" />
            <ThemePicker placement="bottom-end" />
          </div>
        </div>
```

- [ ] **Step 6: Add the `.sidebar-tools` layout rule**

In `src/styles/global.css`, find the `.sidebar-header` rule:

```css
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
```

Add immediately after it:

```css
.sidebar-tools {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 7: Run the drift test to verify it passes**

Run: `npx vitest run tests/font-size-noflash-sync.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 8: Full gate**

Run: `npm run check`
Expected: validate:content + astro check + vitest run + astro build all pass. All font-size tests green; no regressions in existing tests (theme, responsive-css, etc.).

- [ ] **Step 9: Browser verification (dev server)**

Start the `dev` preview, open an article page (`/articles/<any>/`), open the font-size picker in the sidebar header, and verify:
- `A+` / `A−` step the `.article-body` prose up/down; the value label and disabled states update; the reader header title/excerpt stay fixed.
- Reload → the chosen size persists with no first-paint flash.
- Open a listing page (e.g. `/articles/`) → the control renders but changes nothing visible (expected; article-body-scoped).
- No console errors.

- [ ] **Step 10: Commit**

```bash
git add src/layouts/BaseLayout.astro src/styles/global.css tests/font-size-noflash-sync.test.ts
git commit -m "feat: wire FontSizePicker into BaseLayout with no-flash init"
```

---

## Self-Review (completed during plan authoring)

- **Spec coverage:** logic module → Task 1; CSS hook (`--article-font-scale` + `.article-body`) → Task 2; picker component (trigger/dialog/stepper/keyboard/close/aria-live) → Task 3; no-flash + sidebar-header placement → Task 4; test trio → Tasks 1/2/4. All spec sections mapped.
- **Placeholder scan:** no TBD/TODO; every code step shows full code.
- **Type consistency:** function names and signatures in Task 1's Interfaces match their uses in Task 3's `<script>` and Task 4's test. Data-attribute names (`data-font-picker`/`-trigger`/`-panel`/`-decrease`/`-increase`/`-reset`/`-live`) are consistent between the markup and the `setup()` queries. Storage key `"article-font-size-percent"`, levels `[90,100,110,120,130]`, default `100` are identical across module, component, inline script, and tests.
```
