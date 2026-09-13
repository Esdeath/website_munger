import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  THINKING_GRID_GROUP_COUNT,
  bodyWithoutExcerpt,
  loadThinkingGridSnapshot,
  resolveThinkingGridMarkdownLink,
  thinkingGridHref
} from "../src/lib/thinking-grid";

const snapshotDirectory = path.join(process.cwd(), "thinking-grids");
const repositorySnapshot = loadThinkingGridSnapshot();

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
    expect(repositorySnapshot.index.title).toBe("思维格栅");
    expect(repositorySnapshot.index.body).toContain("## 7 组导航");
    expect(repositorySnapshot.models).toHaveLength(108);
    expect(repositorySnapshot.models.find((model) => model.slug === "概率思维与期望值")?.title).toBe(
      "概率思维与期望值：不要问会不会，要问值不值得"
    );
  });

  it("derives seven ordered groups with every copied model linked once", () => {
    expect(repositorySnapshot.layers).toHaveLength(THINKING_GRID_GROUP_COUNT);
    expect(repositorySnapshot.layers[0]).toMatchObject({
      number: 1,
      title: "判断的操作系统",
      question: "我该用什么方式想这个问题？",
      purpose: "拆解、检验、纠错与自我设限。",
      models: expect.arrayContaining([
        expect.objectContaining({ title: "二阶效应", href: "/thinking-grids/二阶效应/" })
      ])
    });
    expect(repositorySnapshot.layers[6]).toMatchObject({
      number: 7,
      title: "估值与下注"
    });
    expect(repositorySnapshot.layers.flatMap((layer) => layer.models)).toHaveLength(108);
    expect(new Set(repositorySnapshot.layers.flatMap((layer) => layer.models.map((model) => model.slug))).size).toBe(108);
  });

  it("keeps Munger's 25-tendency canon inside the misjudgement group", () => {
    const misjudgement = repositorySnapshot.layers.find((layer) => layer.title === "人的误判");
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
    expect(thinkingGridHref("概率思维与期望值")).toBe("/thinking-grids/概率思维与期望值/");
    expect(resolveThinkingGridMarkdownLink("概率思维与期望值.md", repositorySnapshot)).toBe(
      "/thinking-grids/概率思维与期望值/"
    );
    expect(resolveThinkingGridMarkdownLink("README.md", repositorySnapshot)).toBeNull();
    expect(resolveThinkingGridMarkdownLink("../已删除的模型.md", repositorySnapshot)).toBeNull();
    expect(resolveThinkingGridMarkdownLink("#思维操作系统", repositorySnapshot)).toBeUndefined();
    expect(resolveThinkingGridMarkdownLink("https://example.com/model.md", repositorySnapshot)).toBeUndefined();
  });

  it("reuses the default snapshot during production builds", () => {
    vi.stubEnv("PROD", true);
    const readFile = vi.spyOn(fs, "readFileSync");

    try {
      const first = loadThinkingGridSnapshot();
      const readsAfterFirstLoad = readFile.mock.calls.length;
      const second = loadThinkingGridSnapshot();

      expect(readsAfterFirstLoad).toBeGreaterThan(100);
      expect(readFile).toHaveBeenCalledTimes(readsAfterFirstLoad);
      expect(second).not.toBe(first);
      expect(second.models).not.toBe(first.models);
      expect(second.layers).not.toBe(first.layers);
    } finally {
      readFile.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
