import { describe, expect, it } from "vitest";
import {
  loadArticles,
  loadCorpusManifest,
  loadOriginalSources,
  parseCorpusManifest
} from "../src/lib/corpus";

const manifestMarkdown = `# 原始语料清单

| 本地文件 | 年份 | 书名/资料名 | 类型 | 来源链接 | 清洗状态 |
|---|---|---|---|---|---|
| \`shareholders/2023年 每日期刊股东会讲话.md\` | 2023 | 2023年 每日期刊股东会讲话 | 股东信/股东会 | 未记录 | 需复核 |
| \`speech/查理芒格：2023年《最后的访谈CNBC》.md\` | 2023 | 查理芒格：2023年《最后的访谈CNBC》 | 访谈 | 未记录 | 需复核 |
`;

describe("parseCorpusManifest", () => {
  it("parses corpus rows from the manifest table", () => {
    expect(parseCorpusManifest(manifestMarkdown)).toEqual([
      {
        filePath: "shareholders/2023年 每日期刊股东会讲话.md",
        year: "2023",
        title: "2023年 每日期刊股东会讲话",
        type: "股东信/股东会",
        sourceUrl: "未记录",
        status: "需复核"
      },
      {
        filePath: "speech/查理芒格：2023年《最后的访谈CNBC》.md",
        year: "2023",
        title: "查理芒格：2023年《最后的访谈CNBC》",
        type: "访谈",
        sourceUrl: "未记录",
        status: "需复核"
      }
    ]);
  });
});

describe("loaders against repository content", () => {
  it("loads completed articles", () => {
    const articles = loadArticles();
    expect(articles.length).toBeGreaterThanOrEqual(70);
    expect(articles.find((article) => article.keyword === "能力圈")).toBeDefined();
  });

  it("absorbs the three duplicate thought-method articles into their lecture counterparts", () => {
    const articles = loadArticles();
    const lecture01 = articles.find((article) => article.title.startsWith("思维模型讲义01"));
    const lecture02 = articles.find((article) => article.title.startsWith("思维模型讲义02"));
    const lecture15 = articles.find((article) => article.title.startsWith("思维模型讲义15"));

    expect(lecture01?.body).toContain("可口可乐案例");
    expect(lecture01?.body).toContain("《西科金融股东会讲话》2002");
    expect(lecture02?.body).toContain("1962 年油田开采权");
    expect(lecture02?.body).toContain("风险不是报价波动");
    expect(lecture15?.body).toContain("储贷行业危机");
    expect(lecture15?.body).toContain("2021 年谈巴菲特成功");
    expect(articles.map((article) => article.filePath)).not.toEqual(
      expect.arrayContaining([
        "articles/多元思维模型-把知识挂上格栅.md",
        "articles/概率赔率期望值-把赌注押在错价上.md",
        "articles/Lollapalooza叠加效应-二加二不止等于四.md"
      ])
    );
  });

  it("normalizes article dates to YYYY-MM-DD strings", () => {
    const datedArticle = loadArticles().find((article) => article.date !== undefined);

    expect(datedArticle?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("loads original source files", () => {
    const sources = loadOriginalSources();
    expect(sources.length).toBeGreaterThanOrEqual(80);
    expect(sources.find((source) => source.filePath.includes("2023年 每日期刊股东会讲话"))).toBeDefined();
  });

  it("rewrites original source relative image paths to source-directory absolute paths", () => {
    const source = loadOriginalSources().find((item) => item.filePath === "shareholders/1987年 西科金融股东会讲话.md");

    expect(source?.body).toContain("](/shareholders/images/image_-2856457156250514870.png)");
    expect(source?.body).not.toContain("](images/image_-2856457156250514870.png)");
  });

  it("loads corpus manifest metadata", () => {
    const manifest = loadCorpusManifest();
    expect(manifest.length).toBeGreaterThanOrEqual(80);
    expect(manifest.find((entry) => entry.filePath === "shareholders/2023年 每日期刊股东会讲话.md")).toBeDefined();
  });
});
