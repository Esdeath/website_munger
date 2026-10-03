import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteCorpus, loadCorpusManifest } from "../src/lib/corpus";
import { parseSourceKind, sourcePresentation } from "../src/lib/source-types";

describe("summary source identity", () => {
  it("opts in explicitly and preserves legacy behavior", () => {
    expect(parseSourceKind("summary")).toBe("summary");
    for (const value of [undefined, null, "original", "unknown"]) {
      expect(parseSourceKind(value)).toBe("original");
    }
    expect(sourcePresentation({}).informationHeading).toBe("原文信息");
    expect(sourcePresentation({ sourceKind: "summary" })).toEqual({
      label: "中文摘要", informationHeading: "来源信息", relatedHeading: "同类资料"
    });
  });

  it("loads the imported summaries with provenance without changing old sources", () => {
    const sources = loadSiteCorpus().sources;
    const summaries = sources.filter(source => source.sourceKind === "summary");
    expect(summaries).toHaveLength(36);
    expect(sources.find(source => source.filePath === "shareholders/1977年 蓝筹印花致股东信.md")?.sourceKind).toBe("original");
    const manifest = loadCorpusManifest();
    for (const source of summaries) {
      expect(source.title).toMatch(/中文摘要$/);
      expect(source.body).toContain("中文摘要，非全文译文，不作为芒格逐字引文使用");
      expect(source.body).toContain("https://");
      expect(manifest.find(row => row.filePath === source.filePath)?.type).toBe("资料（中文摘要）");
      const summary = source.body.split("## 中文摘要\n")[1].split("## 阅读定位")[0].trim();
      expect(summary.length).toBeGreaterThanOrEqual(200);
      expect(summary.length).toBeLessThanOrEqual(350);
    }
  });

  it("wires the summary presentation into listing and detail templates", () => {
    const listing = fs.readFileSync("src/pages/sources/index.astro", "utf8");
    const detail = fs.readFileSync("src/pages/sources/[slug].astro", "utf8");
    expect(listing).toContain("sourcePresentation(source).label");
    expect(detail).toContain("presentation.informationHeading");
    expect(detail).toContain("presentation.label");
  });
});
