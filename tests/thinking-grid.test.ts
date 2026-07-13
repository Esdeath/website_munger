import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadThinkingGridSnapshot,
  resolveThinkingGridMarkdownLink,
  thinkingGridHref
} from "../src/lib/thinking-grid";

const snapshotDirectory = path.join(process.cwd(), "thinking-grids");

describe("thinking grid snapshot", () => {
  it("contains the index, README, and 178 model documents", () => {
    expect(fs.existsSync(snapshotDirectory)).toBe(true);

    const fileNames = fs.readdirSync(snapshotDirectory).filter((fileName) => fileName.endsWith(".md"));
    expect(fileNames).toHaveLength(180);
    expect(fileNames).toContain("思维格栅.md");
    expect(fileNames).toContain("README.md");
  });

  it("loads the 12-layer index and 178 standalone models", () => {
    const snapshot = loadThinkingGridSnapshot();

    expect(snapshot.index.title).toBe("思维格栅");
    expect(snapshot.index.body).toContain("## 12 层导航");
    expect(snapshot.models).toHaveLength(178);
    expect(snapshot.models.find((model) => model.slug === "概率思维与期望值")?.title).toBe(
      "概率思维与期望值：不要问会不会，要问值不值得"
    );
  });

  it("derives twelve ordered layers with every copied model linked once", () => {
    const snapshot = loadThinkingGridSnapshot();

    expect(snapshot.layers).toHaveLength(12);
    expect(snapshot.layers[0]).toMatchObject({
      number: 1,
      title: "思维操作系统",
      question: "我该如何思考？",
      purpose: "判断、学习、解释与纠错。",
      models: expect.arrayContaining([
        expect.objectContaining({ title: "二阶效应", href: "/thinking-grids/二阶效应/" })
      ])
    });
    expect(snapshot.layers[11]).toMatchObject({
      number: 12,
      title: "制度、历史与价值判断"
    });
    expect(snapshot.layers.flatMap((layer) => layer.models)).toHaveLength(178);
    expect(new Set(snapshot.layers.flatMap((layer) => layer.models.map((model) => model.slug))).size).toBe(178);
  });

  it("creates local URLs only for copied model documents", () => {
    const snapshot = loadThinkingGridSnapshot();

    expect(thinkingGridHref("概率思维与期望值")).toBe("/thinking-grids/概率思维与期望值/");
    expect(resolveThinkingGridMarkdownLink("概率思维与期望值.md", snapshot)).toBe(
      "/thinking-grids/概率思维与期望值/"
    );
    expect(resolveThinkingGridMarkdownLink("README.md", snapshot)).toBeNull();
    expect(resolveThinkingGridMarkdownLink("../taxonomy.md", snapshot)).toBeNull();
    expect(resolveThinkingGridMarkdownLink("#思维操作系统", snapshot)).toBeUndefined();
    expect(resolveThinkingGridMarkdownLink("https://example.com/model.md", snapshot)).toBeUndefined();
  });
});
