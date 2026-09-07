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
