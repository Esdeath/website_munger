# Design: duan-style article font-size switching for munger

Date: 2026-09-07
Status: Approved (pending spec review)

## Goal

Give the munger site the same article font-size control as `website_duan`: a
duan-style picker that scales the **article body prose** across five levels —
90 / 100 / 110 / 120 / 130 % (default 100) — persisted across visits. The user
chose "采用 website_duan 里面的样式", i.e. port duan's font-size system and picker,
adapted to munger's static-Astro stack and existing theme-picker pattern.

Placement (user's choice, "侧栏头部，全站可见"): the picker sits in the global
`.sidebar-header`, right next to the existing `ThemePicker`, shown on every page —
the same persistent-header placement duan uses (its FontSizePicker is paired with
the theme picker in the layout header / library sidebar).

## Non-goals

- No new build tooling, no Vue/Nuxt. munger stays a static Astro site; the picker
  is a vanilla-JS Astro island, mirroring `ThemePicker.astro`.
- The scale affects **article body prose only** (`.article-body`), matching duan's
  "prose only" scope. Reader header title/excerpt (outside `.article-body`, on the
  `--fs-*` tokens) and all chrome (sidebar, nav, listing pages) stay fixed size.
- The standalone Seeking-Wisdom reader iframe (`public/sources/.../reader.html`) is
  self-contained and out of scope — unchanged, does not inherit the scale.

## Source of truth: duan's system (reference)

`website_duan` (`app/utils/articleFontSize.ts`, `app/composables/useArticleFontSize.ts`,
`app/components/FontSizePicker.vue`, `app/assets/css/main.css`):

- Levels `[90, 100, 110, 120, 130]`, default `100`, storage key
  `article-font-size-percent`.
- Applied by setting `--article-font-scale: <percent>%` on `document.documentElement`;
  the article body consumes it via `font-size: var(--article-font-scale)`. All body
  children use `em` units, so the whole prose block scales proportionally.
- The utility module is already pure and DOM-injectable (`StorageLike` / `StyleLike`
  shapes): `normalize`, `step`, `load`, `apply`, `save`. The Vue composable just wraps
  it with a reactive `percentage` ref + `onMounted` load.
- FontSizePicker: an `A`(large)+`a`(small) glyph + chevron trigger opening a
  `role="dialog"` panel labelled 正文字号, containing a stepper group — `A−` / a
  percentage-value button (click = reset) / `A+`. `A−`/`A+` disable at the ends.
  Keyboard `←` decrease / `→` increase / `Home` reset; Escape / click-outside close;
  an `aria-live` region announces the new size. `placement` prop.

## Target: munger (current)

- `.article-body` (in `src/styles/global.css`) is `font-size: 1rem` with **every child
  in `em` / `1em` units** — a single clean hook, exactly duan's model.
- `.article-body` is used by all three reader page types: `articles/[slug].astro`,
  `sources/[slug].astro`, `thinking-grids/[slug].astro`. Scaling it covers all three.
- The theme feature (already merged to `main`) established the pattern this mirrors:
  pure logic module in `src/lib` + Astro island picker in `.sidebar-header` + inline
  pre-paint no-flash script in `BaseLayout.astro` + node-only unit tests.

## Architecture

### 1. CSS hook — `src/styles/global.css`

- Add `--article-font-scale: 100%;` to `:root`.
- Change `.article-body { font-size: 1rem; }` → `font-size: var(--article-font-scale);`.
  `%` in a `font-size` resolves against the parent's computed size (body = 16px), so
  100% == the current `1rem`; children keep their `em` sizing and scale with it.
- Add the picker's scoped-token needs only if missing (`--ease-out` already exists from
  the theme work; reuse `--paper`/`--line`/`--ink`/`--muted`/`--orange`).

### 2. Logic — `src/lib/font-size.ts` (unit-tested, DOM-injectable)

Near-verbatim port of duan's `app/utils/articleFontSize.ts` — already pure and testable
in node (no real DOM). Keep duan's names and semantics:

```ts
export const ARTICLE_FONT_SIZE_LEVELS = [90, 100, 110, 120, 130] as const;
export const ARTICLE_FONT_SIZE_DEFAULT = 100;
export const ARTICLE_FONT_SIZE_STORAGE_KEY = "article-font-size-percent";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type StyleLike = Pick<CSSStyleDeclaration, "setProperty">;

export function normalizeArticleFontSizePercent(value: unknown): number;
  // Number(value) if it is exactly one of LEVELS, else DEFAULT.
export function stepArticleFontSizePercent(value: unknown, direction: -1 | 1): number;
  // normalize, then clamp index+direction into [0, LEVELS.length-1].
export function loadArticleFontSizePercent(storage: Pick<StorageLike, "getItem">): number;
export function applyArticleFontSizePercent(style: StyleLike, value: unknown): number;
  // style.setProperty("--article-font-scale", `${normalized}%`); returns normalized.
export function saveArticleFontSizePercent(
  storage: Pick<StorageLike, "setItem">, style: StyleLike, value: unknown,
): number; // apply + storage.setItem(KEY, String(normalized)); returns normalized.
```

- The Vue composable is **not** ported; its reactive/onMounted behavior is reproduced by
  the picker's vanilla `<script>` (below). All `localStorage` access stays browser-side,
  wrapped in try/catch, never invoked from tests.

### 3. Picker — `src/components/FontSizePicker.astro`

Faithful port of duan's `FontSizePicker.vue`, built on `ThemePicker.astro`'s scaffolding:

- **Markup** (static Astro): a `.font-picker` root; a `.font-trigger` button
  (`A`+`a` glyph + chevron, `aria-label="调整正文字号"`, `aria-haspopup="dialog"`,
  `aria-expanded`, `aria-controls`, `title` = current %); a `.font-panel`
  (`role="dialog"`, labelled 正文字号) holding a stepper group: `A−` button, a
  percentage-value button (reset), `A+` button, plus a `.visually-hidden`
  `aria-live="polite"` region. Prop `placement` (`"top-start" | "bottom-end"`,
  default `"bottom-end"` to match the sidebar header).
- **Scoped `<style>`** ported from duan, restyled with munger tokens
  (`--paper`/`--line`/`--ink`/`--muted`/`--orange`/`--ease-out`) — no duan variable
  names introduced. Honors `prefers-reduced-motion`.
- **`<script>`** (bundled, imports `font-size.ts`): on load, apply
  `loadArticleFontSizePercent(localStorage)` to `document.documentElement.style`
  (try/catch → apply-only fallback) and sync the trigger title / value label /
  `A−`/`A+` disabled state; wire `A−`→step(−1), `A+`→step(+1), value→reset, each
  via `saveArticleFontSizePercent` then a UI re-sync + `aria-live` announce; keyboard
  `←`/`→`/`Home`; Escape / click-outside close with focus restore. Supports multiple
  instances on a page (mirrors ThemePicker).

### 4. No-flash + placement — `src/layouts/BaseLayout.astro`

- **Extend the existing inline `is:inline` head script** (runs before paint): also read
  `localStorage["article-font-size-percent"]` (try/catch), normalize it inline against a
  small duplicated levels list, and `documentElement.style.setProperty("--article-font-scale", n + "%")`.
  Prevents a stored 130% from flashing at 100% on first paint. Canonical logic stays in
  `font-size.ts`; the duplication is guarded by a drift test.
- **Placement:** in `.sidebar-header`, group the two controls (e.g. a `.sidebar-tools`
  flex wrapper) with `<FontSizePicker placement="bottom-end" />` beside
  `<ThemePicker placement="bottom-end" />`, brand on the left. Shown on every page.
  Add/adjust the minimal `global.css` rule for the two-control cluster.

## Data flow

1. Head inline script sets `--article-font-scale` before first paint from stored value.
2. `FontSizePicker` script hydrates, re-applies/loads the stored percent, syncs its UI.
3. User steps/resets → `saveArticleFontSizePercent(...)` updates `:root` var + persists;
   picker updates its trigger title, value label, disabled states, aria-live.
4. `.article-body` prose reflows to the new scale on every reader page.
5. Next visit: step 1 restores the stored choice.

## Error handling

- All `localStorage` access wrapped in try/catch (private-mode / storage-policy safe);
  the CSS `:root` default (100%) remains usable when storage is unavailable.
- `stepArticleFontSizePercent` clamps at both ends; `A−`/`A+` also disable at the ends.
- Non-numeric / out-of-range stored values normalize to 100%.
- `prefers-reduced-motion` honored in picker CSS (ported from duan).

## Testing (node env, no DOM — mirrors the theme test trio)

- **New `tests/font-size.test.ts`** over `src/lib/font-size.ts`:
  - `normalize`: valid level passes through; junk / out-of-range / `null` → 100.
  - `step`: +1 / −1 move one level; clamps at 90 (can't go below) and 130 (can't exceed).
  - `load`: reads + normalizes from an injected `getItem` stub.
  - `apply`: sets `--article-font-scale` to `"<n>%"` on an injected `setProperty` stub and
    returns the normalized number.
  - `save`: applies **and** writes `String(normalized)` to an injected `setItem` stub.
- **New `tests/font-size-css.test.ts`**: `global.css` defines `--article-font-scale: 100%`
  on `:root` and `.article-body` consumes `var(--article-font-scale)`.
- **New `tests/font-size-noflash-sync.test.ts`**: the inline `BaseLayout` script embeds the
  storage key, the levels, and the default — drift guard against `font-size.ts` constants
  (parallels `tests/theme-noflash-sync.test.ts`).
- `npm run check` (validate:content + astro check + vitest + astro build) stays green.
- Browser-preview verification: step up/down on an article, confirm `.article-body` prose
  scales while the reader header stays fixed; reload persistence; no first-paint flash; the
  control renders on a listing page too (no effect there, expected).

## Files touched

- `src/styles/global.css` — `--article-font-scale` var + `.article-body` hook + control cluster rule.
- `src/lib/font-size.ts` — new (port of duan's articleFontSize.ts).
- `src/components/FontSizePicker.astro` — new (port of duan's FontSizePicker.vue).
- `src/layouts/BaseLayout.astro` — extend inline no-flash script; add FontSizePicker to `.sidebar-header`.
- `tests/font-size.test.ts`, `tests/font-size-css.test.ts`, `tests/font-size-noflash-sync.test.ts` — new.

## Delivery

Branch `feat/duan-font-size` (off current `main`, which already carries the merged theme
feature). Execute via subagent-driven-development: one implementer + task review per task,
a final whole-branch review, then finish the branch.
