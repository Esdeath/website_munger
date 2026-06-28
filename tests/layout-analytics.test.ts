import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site analytics", () => {
  it("loads Baidu Tongji from the shared layout", () => {
    const layoutSource = readFileSync("src/layouts/BaseLayout.astro", "utf8");

    expect(layoutSource).toContain("hm.baidu.com/hm.js?27ba6ea2e1b2f30c1acf9ed6977e1c8b");
    expect(layoutSource).toContain("var _hmt = _hmt || [];");
  });
});
