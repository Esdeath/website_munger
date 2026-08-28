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

  it("keeps the reader controls: table of contents, font size, search and themes", () => {
    for (const id of ["menuBtn", "fsDown", "fsUp", "q", "progress", "resume"]) {
      expect(reader).toContain(`id="${id}"`);
    }
    for (const theme of ["light", "warm", "night"]) {
      expect(reader).toContain(`data-theme="${theme}"`);
    }
  });
});
