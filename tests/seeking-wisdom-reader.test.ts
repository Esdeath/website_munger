import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reader = readFileSync("public/sources/seeking-wisdom-中文版/reader.html", "utf8");

describe("Seeking Wisdom standalone reader", () => {
  it("is the Bevelin reader document", () => {
    expect(reader).toContain("<title>探索智慧：从达尔文到芒格 —— 皮特·贝弗林</title>");
    expect(reader).toContain('lang="zh-CN"');
  });

  it("carries the whole book: four chapters, four appendices, preface and epilogue", () => {
    for (const id of ["ack", "preface", "ch1", "ch2", "ch3", "ch4", "app1", "app2", "app3", "app4", "epilogue"]) {
      expect(reader).toContain(`id="${id}"`);
    }
  });

  it("is fully self-contained so the embedded reader works offline", () => {
    expect(reader).not.toMatch(/(?:src|href)="https?:\/\//);
  });

  it("keeps the reader controls: table of contents, font size, search and progress", () => {
    for (const id of ["menuBtn", "fsDown", "fsUp", "q", "progress", "resume"]) {
      expect(reader).toContain(`id="${id}"`);
    }
  });

  it("uses the site's paper-and-orange palette", () => {
    expect(reader).toContain("--paper:#f4f0e8;");
    expect(reader).toContain("--panel:#fffaf4;");
    expect(reader).toContain("--page:#fffdf8;");
    expect(reader).toContain("--ink:#2f2a24;");
    expect(reader).toContain("--rule:#ead8c3;");
    expect(reader).toContain("--amber:#d89138;");
    expect(reader).toContain("--accent:#a85f18;");
  });

  it("drops its own theme switcher so the page follows the site's single theme", () => {
    expect(reader).not.toContain("data-theme-btn=");
    expect(reader).not.toContain('html[data-theme="warm"]');
    expect(reader).not.toContain('html[data-theme="night"]');
    expect(reader).toContain('setTheme("light");');
  });

  it("docks its table of contents on the right so it does not stack under the site sidebar", () => {
    expect(reader).toMatch(/\.toc\{position:fixed;top:var\(--bar\);bottom:0;right:0;left:auto;/);
    expect(reader).toContain("border-left:1px solid var(--rule);background:var(--panel)");
    expect(reader).toContain(".wrap{margin-right:280px;");
    expect(reader).toContain(".toc{transform:translateX(100%);");
    expect(reader).toContain(".wrap{margin-right:0}");
  });
});
