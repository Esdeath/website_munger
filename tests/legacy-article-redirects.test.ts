import { describe, expect, it } from "vitest";
import { LEGACY_ARTICLE_REDIRECTS } from "../src/content/legacy-article-redirects";

describe("legacy article redirects", () => {
  it("redirects each removed thought-method article to its merged lecture", () => {
    expect(LEGACY_ARTICLE_REDIRECTS).toEqual({
      "/articles/多元思维模型-把知识挂上格栅/": "/articles/思维模型讲义01-为什么不能只拿一把锤子/",
      "/articles/概率赔率期望值-把赌注押在错价上/": "/articles/思维模型讲义02-数学不是公式而是判断力/",
      "/articles/lollapalooza叠加效应-二加二不止等于四/": "/articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论/"
    });
  });
});
