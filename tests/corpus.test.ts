import { describe, expect, it } from "vitest";
import {
  loadArticles,
  loadCorpusManifest,
  loadOriginalSources,
  parseCorpusManifest
} from "../src/lib/corpus";
import { renderMarkdownToHtml } from "../src/lib/render";

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
    const lecture09 = articles.find((article) => article.title.startsWith("思维模型讲义09"));

    expect(lecture01?.body).toContain("专业化思维");
    expect(lecture01?.body).toContain("可口可乐案例");
    expect(lecture01?.body).toContain("《西科金融股东会讲话》2002");
    expect(lecture02?.body).toContain("彩池投注");
    expect(lecture02?.body).toContain("1962 年油田开采权");
    expect(lecture02?.body).toContain("拍卖制度只允许中间商参加");
    expect(lecture02?.body).toContain("判断他们不会报出合理价格");
    expect(lecture02?.body).toContain("两人各付了 1000 美元首付款");
    expect(lecture02?.body).toContain("其余款项用贷款支付");
    expect(lecture02?.body).not.toContain("公开报价");
    expect(lecture02?.body).not.toContain("报价冲突");
    expect(lecture02?.body).not.toContain("地下储量估计成功概率");
    expect(lecture02?.sources).toContain("2014年 每日期刊股东会讲话");
    expect(lecture02?.body).toContain(
      "股票史上的某位传奇人物有句名言：\u201c 钱是坐着等来的。\u201d坐着等，不是等下一次大跌，靠猜涨跌是做不成投资的。这句话的意思是说，要取得良好的投资业绩，必须要有足够的耐心。有足够的耐心等待，等到机会来临时，果断出手，大量买入。\u300d\n> ——《2016年 每日期刊股东会讲话》"
    );
    expect(lecture02?.body).toContain(
      "做投资，一定要非常耐心，一定要等到好机会出现。价格特别便宜，一眼就能看出来很值，才买入。整天待在那，什么也不做，这是反人性的。\u300d\n> ——《2014年 每日期刊股东会讲话》"
    );
    expect(lecture02?.body).toContain("永久性损失");
    expect(lecture02?.body).toContain("风险不是报价波动");
    expect(lecture09?.body).toContain("储贷行业危机");
    expect(lecture09?.body).toContain("2021 年谈巴菲特成功");
    expect(articles.map((article) => article.filePath)).not.toEqual(
      expect.arrayContaining([
        "articles/多元思维模型-把知识挂上格栅.md",
        "articles/概率赔率期望值-把赌注押在错价上.md",
        "articles/Lollapalooza叠加效应-二加二不止等于四.md"
      ])
    );
  });

  it("absorbs hard-science and misjudgment-psychology topics into their lecture counterparts", () => {
    const articles = loadArticles();
    const hardScience = articles.find((article) => article.title.startsWith("思维模型讲义04"));
    const psychology = articles.find((article) => article.title.startsWith("思维模型讲义06"));

    expect(hardScience?.body).toContain("后备系统");
    expect(hardScience?.body).toContain("临界点");
    expect(hardScience?.body).toContain("非线性");
    expect(hardScience?.aliases).toEqual(expect.arrayContaining(["物理学模型"]));
    expect(psychology?.body).toContain("激励机制");
    expect(psychology?.body).toContain("社会认同");
    expect(psychology?.body).toContain("巴甫洛夫联想");
    expect(psychology?.aliases).toEqual(
      expect.arrayContaining(["激励机制", "社会认同与巴甫洛夫联想", "社会认同", "巴甫洛夫联想"])
    );
  });

  it("absorbs scale disadvantages and technology topics into their lecture counterparts", () => {
    const articles = loadArticles();
    const scale = articles.find((article) => article.title.startsWith("思维模型讲义07"));
    const competition = articles.find((article) => article.title.startsWith("思维模型讲义08"));

    expect(scale?.body).toContain("规模优势");
    expect(scale?.body).toContain("规模劣势");
    expect(scale?.body).toContain("官僚");
    expect(competition?.body).toContain("普通商品");
    expect(competition?.body).toContain("纺织机");
    expect(competition?.body).toContain("竞争性毁灭");
  });

  it("absorbs checklist and common-sense methods into their judgment-discipline articles", () => {
    const articles = loadArticles();
    const inversion = articles.find((article) => article.title.startsWith("思维模型讲义10"));
    const rationality = articles.find((article) => article.title.startsWith("思维模型讲义11"));

    expect(inversion?.body).toContain("检查清单");
    expect(inversion?.body).toContain("飞行员");
    expect(inversion?.body).toContain("心理学家解读米尔格拉姆电击实验");
    expect(inversion?.body).toContain("涉及六种强大的心理倾向");
    expect(inversion?.body).toContain("房地产评估师先用每英亩价值乘以面积");
    expect(inversion?.body).toContain("丘陵和输电塔位置");
    expect(inversion?.body).toContain("「最后我们拿到了60万美元」");
    expect(inversion?.quoteCount).toBe(20);
    expect(inversion?.aliases).toEqual(
      expect.arrayContaining(["逆向思维 / 反过来想", "反过来想", "检查清单"])
    );
    expect(rationality?.body).toContain("道德追求");
    expect(rationality?.body).toContain("有组织的常识");
    expect(rationality?.body).toContain("反面证据");
    expect(rationality?.body).toContain("大学不受当地分区规划规则的限制");
    expect(rationality?.body).toContain("芒格描述投资经理买入高收益的 AAA 级抵押证券");
    expect(rationality?.body).not.toContain("汤姆·汤布雷洛描述投资经理");
    expect(rationality?.aliases).toEqual(expect.arrayContaining(["常识"]));
  });

  it("removes all nine absorbed source files from the final corpus", () => {
    const filePaths = loadArticles().map((article) => article.filePath);

    expect(filePaths).not.toEqual(
      expect.arrayContaining([
        "articles/跨学科普世智慧-把各学科的大思想综合起来.md",
        "articles/思维模型讲义14-投资模型股市像彩池投注.md",
        "articles/思维模型讲义05-物理学临界点和非线性世界.md",
        "articles/思维模型讲义08-激励机制告诉我激励我告诉你结果.md",
        "articles/思维模型讲义09-社会认同与巴甫洛夫联想.md",
        "articles/思维模型讲义11-规模劣势大为什么会变蠢.md",
        "articles/思维模型讲义13-技术模型新技术帮你还是毁掉你.md",
        "articles/检查清单-像飞行员一样起飞前逐项核对.md",
        "articles/常识-并不常见的判断力.md"
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

  it("does not expose strong-emphasis markers in rendered original sources", async () => {
    const malformedSources: string[] = [];

    for (const source of loadOriginalSources()) {
      const html = await renderMarkdownToHtml(source.body);
      if (html.includes("**")) {
        malformedSources.push(source.filePath);
      }
    }

    expect(malformedSources).toEqual([]);
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
