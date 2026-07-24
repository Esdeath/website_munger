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

  it("loads article keyword aliases", () => {
    const lecture = loadArticles().find((article) => article.title.startsWith("思维模型讲义01"));

    expect(lecture?.aliases).toEqual(expect.arrayContaining(["铁锤人综合症"]));
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

  it("loads the standalone Seeking Wisdom HTML at its established source slug", () => {
    const source = loadOriginalSources().find((item) => item.slug === "seeking-wisdom-中文版");

    expect(source).toEqual(
      expect.objectContaining({
        filePath: "public/sources/seeking-wisdom-中文版/reader.html",
        title: "探索智慧：从达尔文到芒格",
        type: "speech",
        year: "2003",
        standalone: true
      })
    );
  });

  it("loads all Li Lu source files as a separate source type", () => {
    const sources = loadOriginalSources().filter((source) => source.type === "li-lu");

    expect(sources).toHaveLength(14);
    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: "li-lu/李录：2006年哥伦比亚大学商学院演讲.md",
          year: "2006",
          title: "价值投资的常识与⽅法—2006在哥伦比亚大学商学院的讲座"
        }),
        expect.objectContaining({
          filePath: "li-lu/李录：2023年怀念我的老师查理·芒格.md",
          year: "2023",
          title: "李录：2023年怀念我的老师查理·芒格"
        })
      ])
    );
  });

  it("loads Li Lu source titles without Markdown formatting markers", () => {
    const titles = loadOriginalSources()
      .filter((source) => source.type === "li-lu")
      .map((source) => source.title);

    expect(titles).not.toEqual(expect.arrayContaining([expect.stringMatching(/\*\*|__/)]));
    expect(titles).toContain("2018年《红周刊》独家对话美国喜马拉雅资本创始人及董事长李录");
  });

  it("rewrites original source relative image paths to source-directory absolute paths", () => {
    const source = loadOriginalSources().find((item) => item.filePath === "shareholders/1987年 西科金融股东会讲话.md");

    expect(source?.body).toContain("](/shareholders/images/image_-2856457156250514870.png)");
    expect(source?.body).not.toContain("](images/image_-2856457156250514870.png)");
  });

  it("rewrites Li Lu relative image paths to li-lu absolute paths", () => {
    const source = loadOriginalSources().find(
      (item) => item.filePath === "li-lu/李录：2006年哥伦比亚大学商学院演讲.md"
    );

    expect(source?.body).toContain("](/li-lu/images/2006-columbia-image.png)");
    expect(source?.body).not.toContain("](images/2006-columbia-image.png)");
  });

  it("loads corpus manifest metadata", () => {
    const manifest = loadCorpusManifest();
    expect(manifest.length).toBeGreaterThanOrEqual(80);
    expect(manifest.find((entry) => entry.filePath === "shareholders/2023年 每日期刊股东会讲话.md")).toBeDefined();
  });
});
