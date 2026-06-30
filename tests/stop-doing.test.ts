import { describe, expect, it } from "vitest";
import { parseStopDoingList } from "../src/lib/stop-doing";

const noSources: { slug: string; title: string }[] = [];

describe("parseStopDoingList", () => {
  it("parses one topic with one entry", () => {
    const md = [
      "## 投资原则",
      "",
      "### 不要因为喜欢活动就去活动",
      "> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014",
      ""
    ].join("\n");

    const groups = parseStopDoingList(md, noSources);

    expect(groups).toHaveLength(1);
    expect(groups[0].topic.title).toBe("投资原则");
    expect(groups[0].topic.slug).toBe("investment-principles");
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0]).toEqual({
      headline: "不要因为喜欢活动就去活动",
      quote: "我们不是因为喜欢活动而活动，我们喜欢的是赚钱。",
      sourceTitle: "2014年 每日期刊股东会讲话",
      sourceYear: "2014",
      sourceSlug: null
    });
  });
});
