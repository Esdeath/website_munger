import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  THINKING_GRID_GROUP_COUNT,
  bodyWithoutExcerpt,
  loadThinkingGridSnapshot,
  resolveThinkingGridMarkdownLink,
  thinkingGridHref
} from "../src/lib/thinking-grid";

const snapshotDirectory = path.join(process.cwd(), "thinking-grids");

describe("thinking grid snapshot", () => {
  it("removes the title and first paragraph before rendering a model body", () => {
    expect(
      bodyWithoutExcerpt(
        "# 模型标题\n\n这是摘要。\n\n这是正文第二段。\n\n## 下一节\n\n后续内容。"
      )
    ).toBe("这是正文第二段。\n\n## 下一节\n\n后续内容。");
  });

  it("contains the index, README, and 108 model documents", () => {
    expect(fs.existsSync(snapshotDirectory)).toBe(true);

    const fileNames = fs.readdirSync(snapshotDirectory).filter((fileName) => fileName.endsWith(".md"));
    expect(fileNames).toHaveLength(110);
    expect(fileNames).toContain("思维格栅.md");
    expect(fileNames).toContain("README.md");
  });

  it("loads the 7-group index and 108 standalone models", () => {
    const snapshot = loadThinkingGridSnapshot();

    expect(snapshot.index.title).toBe("思维格栅");
    expect(snapshot.index.body).toContain("## 7 组导航");
    expect(snapshot.models).toHaveLength(108);
    expect(snapshot.models.find((model) => model.slug === "概率思维与期望值")?.title).toBe(
      "概率思维与期望值：不要问会不会，要问值不值得"
    );
  });

  it("derives seven ordered groups with every copied model linked once", () => {
    const snapshot = loadThinkingGridSnapshot();

    expect(snapshot.layers).toHaveLength(THINKING_GRID_GROUP_COUNT);
    expect(snapshot.layers[0]).toMatchObject({
      number: 1,
      title: "判断的操作系统",
      question: "我该用什么方式想这个问题？",
      purpose: "拆解、检验、纠错与自我设限。",
      models: expect.arrayContaining([
        expect.objectContaining({ title: "二阶效应", href: "/thinking-grids/二阶效应/" })
      ])
    });
    expect(snapshot.layers[6]).toMatchObject({
      number: 7,
      title: "估值与下注"
    });
    expect(snapshot.layers.flatMap((layer) => layer.models)).toHaveLength(108);
    expect(new Set(snapshot.layers.flatMap((layer) => layer.models.map((model) => model.slug))).size).toBe(108);
  });

  it("keeps Munger's 25-tendency canon inside the misjudgement group", () => {
    const snapshot = loadThinkingGridSnapshot();
    const misjudgement = snapshot.layers.find((layer) => layer.title === "人的误判");
    const slugs = new Set(misjudgement?.models.map((model) => model.slug));

    for (const canon of [
      "被剥夺超级反应倾向",
      "避免不一致性倾向",
      "错误衡量易得性倾向",
      "康德式公平倾向",
      "废话倾向",
      "lollapalooza-倾向"
    ]) {
      expect(slugs).toContain(canon);
    }
  });

  it("renders the homepage from layers instead of the raw index markdown", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/pages/thinking-grids/index.astro"),
      "utf8"
    );

    expect(page).toContain('class="thinking-grid-layers"');
    expect(page).toContain("snapshot.layers.map");
    expect(page).not.toContain("renderMarkdownToHtml");
  });

  it("creates local URLs only for copied model documents", () => {
    const snapshot = loadThinkingGridSnapshot();

    expect(thinkingGridHref("概率思维与期望值")).toBe("/thinking-grids/概率思维与期望值/");
    expect(resolveThinkingGridMarkdownLink("概率思维与期望值.md", snapshot)).toBe(
      "/thinking-grids/概率思维与期望值/"
    );
    expect(resolveThinkingGridMarkdownLink("README.md", snapshot)).toBeNull();
    expect(resolveThinkingGridMarkdownLink("../已删除的模型.md", snapshot)).toBeNull();
    expect(resolveThinkingGridMarkdownLink("#思维操作系统", snapshot)).toBeUndefined();
    expect(resolveThinkingGridMarkdownLink("https://example.com/model.md", snapshot)).toBeUndefined();
  });
});
