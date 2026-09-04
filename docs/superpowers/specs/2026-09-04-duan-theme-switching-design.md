# Design: duan-style 3-theme color switching for munger

Date: 2026-09-04
Status: Approved (pending spec review)

## Goal

Give the munger site the same theme color-switching feature as `website_duan`:
three themes — **浅色 (light)**, **墨黑 (dark)**, **护眼绿 (green)** — chosen from a
duan-style dropdown picker, persisted across visits, with duan's exact palettes
applied site-wide (the user chose "完全采用 duan 的三套配色").

## Non-goals

- The standalone Seeking-Wisdom reader (`public/sources/seeking-wisdom-中文版/reader.html`)
  is a self-contained iframe document with its own palette and deliberately has **no**
  theme switcher (`tests/seeking-wisdom-reader.test.ts` asserts this). It is **out of scope**
  and unchanged; the iframe does not inherit the parent site's theme.
- No new build tooling, no Vue/Nuxt. munger stays a static Astro site; the picker is a
  vanilla-JS Astro island.

## Source of truth: duan's system (reference)

`website_duan` (`app/composables/useTheme.ts`, `app/components/ThemePicker.vue`,
`app/assets/css/main.css`):

- Themes applied via `<html>` classes: `dark`, `green` (light = no class).
- Each theme redefines CSS custom properties.
- Persisted to `localStorage['theme']`; falls back to `prefers-color-scheme`.
- Updates `<meta name="theme-color">` and `color-scheme` on switch.
- ThemePicker: swatch+chevron trigger button opening a menu of 3 options
  (swatch, label, checkmark), keyboard nav (Arrow/Home/End/Escape/Tab),
  ARIA (`aria-haspopup=menu`, `role=menu`, `role=menuitemradio`, `aria-checked`),
  click-outside / focusout / Escape to close.

## Target: munger (current)

- Astro static site, single warm-paper/orange light theme, no switcher.
- All theming lives in `src/styles/global.css`; every theme variable is used **only**
  in that file (verified), so redefining values changes the whole site with no markup churn.
- munger uses different variable names than duan; we keep munger's names and map duan's
  values onto them.

## Architecture

### 1. Palette — `src/styles/global.css`

Redefine munger's existing variables with duan's values. `:root` becomes duan's **light**;
add `html.dark` and `html.green` blocks.

Key simplification: `:root` defines `--green: var(--orange)`, `--green-dark: var(--orange-dark)`,
`--green-soft: var(--orange-soft)`. CSS custom-property substitution resolves at use-time,
so each theme block only overrides the concrete `--orange*` (and other concrete) vars —
the `--green*` aliases follow automatically and stay declared once in `:root`.

Also add `--ease-out: cubic-bezier(0.16, 1, 0.3, 1);` to `:root` (used by the picker) and a
per-theme `color-scheme`.

Concrete per-theme values (duan-derived; `--paper-soft` currently unused, kept defined for safety):

| munger var       | light (`:root`)                     | `html.dark`                     | `html.green`                       |
|------------------|-------------------------------------|---------------------------------|------------------------------------|
| `--bg`           | `#f8f5f0`                            | `#1a1a1a`                       | `#c0edc6`                          |
| `--paper`        | `#ffffff`                            | `#222222`                       | `#d2f1d7`                          |
| `--paper-soft`   | `#f8f5f0`                            | `#1f1f1f`                       | `#cbeecf`                          |
| `--ink`          | `#2c2c2c`                            | `#e5e5e5`                       | `#20231f`                          |
| `--ink-strong`   | `#1f1c17`                            | `#f2f2f2`                       | `#171a16`                          |
| `--muted`        | `#777777`                            | `#999999`                       | `#4d6253`                          |
| `--line`         | `#dddddd`                            | `#333333`                       | `#8faf97`                          |
| `--line-strong`  | `#c9c2b8`                            | `#444444`                       | `#7a9a82`                          |
| `--orange`       | `#b5462a`                            | `#e07a5a`                       | `#8f3d2c`                          |
| `--orange-dark`  | `#9a3a22`                            | `#e8917a`                       | `#7a3325`                          |
| `--orange-soft`  | `rgba(181,70,42,0.08)`              | `rgba(224,122,90,0.10)`        | `rgba(143,61,44,0.10)`            |
| `--red`          | `#b5462a`                            | `#e07a5a`                       | `#8f3d2c`                          |
| `--shadow`       | `0 18px 42px rgb(119 75 32 / 0.10)` | `0 18px 42px rgb(0 0 0 / 0.5)`  | `0 18px 42px rgb(24 34 27 / 0.18)` |
| `color-scheme`   | `light`                             | `dark`                          | `light`                            |

Note: on `dark`, `--orange-dark` (used as brand/nav/link **text** via the `--green-dark`
alias) is *lighter* than `--orange` so text stays legible on the dark background.

### 2. Logic — `src/lib/theme.ts` (unit-tested, DOM-injectable)

Mirrors duan's `useTheme`, but framework-free and testable in node (no real DOM):

```ts
export type Theme = "light" | "dark" | "green";

export const THEMES: readonly Theme[]                     // ["light","dark","green"]
export const themeMeta: Record<Theme,{label,color}>       // 浅色/墨黑/护眼绿 + swatch hex
export const themeMetaColors: Record<Theme,string>        // theme-color meta values
export function isTheme(v: string | null): v is Theme
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme
export function applyTheme(theme: Theme, targets: {
  root: { classList: { add(c): void; remove(c): void }; style: { colorScheme: string } };
  meta: { setAttribute(name, value): void } | null;
}): void
```

- `themeMeta`/`themeMetaColors`: light `#f8f5f0`, dark `#1a1a1a`, green `#c0edc6`;
  labels 浅色 / 墨黑 / 护眼绿.
- `resolveInitialTheme`: returns `stored` if a valid theme, else `prefersDark ? "dark" : "light"`.
- `applyTheme`: removes `dark`/`green`, adds the class for non-light themes, sets
  `style.colorScheme` and the meta `content`. Pure w.r.t. injected targets — no globals.
- Persistence (`localStorage`) stays in the browser-side callers, wrapped in try/catch,
  so it is never invoked from tests.

### 3. Picker — `src/components/ThemePicker.astro`

Faithful port of duan's `ThemePicker.vue`:

- **Markup** rendered statically (Astro): a `.theme-picker` root, a `.theme-trigger`
  button (swatch + chevron, correct ARIA), and a `.theme-menu` with one `.theme-option`
  per theme (swatch, label, checkmark), all three options in the DOM. Prop `placement`
  (`"top-start" | "bottom-end"`, default `"bottom-end"` for the sidebar header).
- **Scoped `<style>`** ported from duan but restyled with munger tokens
  (`--paper`, `--line`, `--ink`, `--muted`, `--orange`, `--ease-out`) — no duan variable
  names introduced.
- **`<script>`** (bundled, imports `theme.ts`): on load, syncs picker UI to the current
  theme; handles trigger toggle, option click (→ `applyTheme` + persist + update trigger
  swatch/active checkmark/aria), keyboard nav, click-outside/focusout/Escape close.
  Written to support multiple picker instances on a page.

### 4. No-flash + placement — `src/layouts/BaseLayout.astro`

- **Inline `is:inline` head script** (self-contained, runs before paint): read
  `localStorage['theme']` (try/catch) → fallback `matchMedia('(prefers-color-scheme: dark)')`
  → add class to `documentElement`, set `color-scheme`, set `theme-color` meta. Prevents the
  dark-mode flash of a static page. ~10 lines; minimal, intentional duplication of the
  theme→class/color map (canonical logic stays in `theme.ts`).
- Change the default `<meta name="theme-color">` from `#f4f0e8` to light `#f8f5f0`.
- **Placement:** wrap the sidebar brand in a `.sidebar-header` row (flex, space-between)
  with `<ThemePicker placement="bottom-end" />` right-aligned; menu opens downward.
  Desktop: always visible. Mobile: reachable via the nav drawer (matches duan's primary
  placement). Add `.sidebar-header` rule to `global.css`.

## Data flow

1. Head inline script applies theme before first paint (class + color-scheme + meta).
2. `ThemePicker` script hydrates, reads current theme, syncs its UI.
3. User selects a theme → `applyTheme(...)` updates DOM + meta, picker persists to
   `localStorage`, picker updates its own trigger/menu state.
4. Next visit: step 1 restores the stored choice.

## Error handling

- All `localStorage` access wrapped in try/catch (private-mode / storage-policy safe);
  the visible theme still applies from `prefers-color-scheme` when storage is unavailable.
- Missing `theme-color` meta → `applyTheme` no-ops on the meta (null-guarded).
- `prefers-reduced-motion` honored in the picker CSS (ported from duan).

## Testing

- **New `tests/theme.test.ts`** over `src/lib/theme.ts`:
  - `isTheme` accepts the three themes, rejects others / null.
  - `resolveInitialTheme`: valid stored wins; invalid+prefersDark → `dark`;
    invalid+!prefersDark → `light`.
  - `applyTheme` with stub targets: light removes both classes; dark adds `dark`;
    green adds `green`; each sets the right `colorScheme` and meta `content`.
- **`global.css` assertion** (extend an existing style test or add one): file contains
  `html.dark` and `html.green` blocks and duan's key values (`#1a1a1a`, `#c0edc6`).
- `npm run check` (validate:content + astro check + vitest + astro build) stays green;
  existing `seeking-wisdom-reader` test is unaffected (reader untouched).
- Browser-preview verification: switch all three themes, confirm class/meta update,
  reload persistence, and no first-paint flash.

## Files touched

- `src/styles/global.css` — palette rewrite + `.sidebar-header` + `--ease-out`.
- `src/lib/theme.ts` — new.
- `src/components/ThemePicker.astro` — new.
- `src/layouts/BaseLayout.astro` — inline head script, default meta color, sidebar-header + picker.
- `tests/theme.test.ts` — new.
