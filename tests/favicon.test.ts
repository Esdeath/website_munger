import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site favicon", () => {
  it("uses a Munger-themed SVG icon based on the 芒 character", () => {
    expect(existsSync("public/favicon.svg")).toBe(true);

    const favicon = readFileSync("public/favicon.svg", "utf8");
    expect(favicon).toContain("<svg");
    expect(favicon).toContain("芒");
    expect(favicon).toContain("#38654e");
  });

  it("links the favicon from the shared layout", () => {
    const layoutSource = readFileSync("src/layouts/BaseLayout.astro", "utf8");

    expect(layoutSource).toContain('rel="icon"');
    expect(layoutSource).toContain('href="/favicon.svg"');
  });
});
