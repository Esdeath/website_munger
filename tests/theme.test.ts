import { describe, expect, it } from "vitest";
import {
  applyTheme,
  isTheme,
  THEMES,
  themeMeta,
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

describe("applyTheme", () => {
  it("light clears theme classes and sets a light scheme + meta", () => {
    const { targets, classes, style, meta } = makeTargets();
    targets.root.classList.add("dark");
    applyTheme("light", targets);
    expect(classes.has("dark")).toBe(false);
    expect(classes.has("green")).toBe(false);
    expect(style.colorScheme).toBe("light");
    expect(meta()).toBe(themeMeta.light.color);
  });
  it("dark adds the dark class and a dark scheme", () => {
    const { targets, classes, style, meta } = makeTargets();
    applyTheme("dark", targets);
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("green")).toBe(false);
    expect(style.colorScheme).toBe("dark");
    expect(meta()).toBe(themeMeta.dark.color);
  });
  it("green adds the green class with a light scheme", () => {
    const { targets, classes, style, meta } = makeTargets();
    applyTheme("green", targets);
    expect(classes.has("green")).toBe(true);
    expect(classes.has("dark")).toBe(false);
    expect(style.colorScheme).toBe("light");
    expect(meta()).toBe(themeMeta.green.color);
  });
  it("does not throw when the meta element is absent", () => {
    const { targets } = makeTargets();
    targets.meta = null;
    expect(() => applyTheme("dark", targets)).not.toThrow();
  });
});
