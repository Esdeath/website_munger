import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/sources/seeking-wisdom-中文版/index.astro", "utf8");
const layout = readFileSync("src/layouts/BaseLayout.astro", "utf8");

describe("embedded Seeking Wisdom page", () => {
  it("renders the standalone reader inside the shared site layout", () => {
    expect(page).toContain('<BaseLayout title={source.title} description={source.excerpt}>');
    expect(page).toContain('class="standalone-reader-frame"');
    expect(page).toContain('src="/sources/seeking-wisdom-中文版/reader.html"');
  });

  it("places the top-level entry after the stop-doing list", () => {
    const topLinks = layout.slice(layout.indexOf('<ul class="sidebar-tree">'), layout.indexOf("{sidebarSections.map"));

    expect(topLinks.indexOf("STOP_DOING_NAV")).toBeGreaterThanOrEqual(0);
    expect(topLinks.indexOf("SEEKING_WISDOM_NAV")).toBeGreaterThan(topLinks.indexOf("STOP_DOING_NAV"));
  });
});
