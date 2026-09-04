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
