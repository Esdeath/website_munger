# 思维模型讲义合并 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“思维方法”与“思维模型讲义”收敛为 21 篇有序的“思维模型讲义”文章，并将三篇旧文章安全合并到主线讲义。

**Architecture:** 文章 frontmatter 与 `TOPICS` 定义决定栏目、主题页、侧栏和相关文章归属。三篇重复文章的独有内容先写入三个目标讲义并通过逐篇核对表验证，再删除源 Markdown；Astro 配置中的静态 redirects 保留旧 slug 的访问路径。

**Tech Stack:** Astro 4 static output、TypeScript、Vitest、Markdown/YAML frontmatter、现有 `tools/check_article.py`。

## Global Constraints

- 合并后仅保留“思维模型讲义”栏目，不保留“思维方法”主题、侧栏分组或重复正文页面。
- 主线讲义的顺序保持 01–15；六篇补充课的 `order` 必须为 16–21。
- 仅合并 `多元思维模型`、`概率·赔率·期望值`、`Lollapalooza 叠加效应` 三篇；其余六篇保留独立 URL 与正文。
- 目标讲义必须吸收被移除文章的独有定义、案例、反例、边界和来源，不能只在文末列出旧文章名称。
- 三个旧文章 slug 必须生成静态跳转到对应讲义，思维格栅、原文资料和无关栏目不改动。

---

### Task 1: 添加旧文章 URL 跳转与回归测试

**Files:**
- Create: `src/content/legacy-article-redirects.ts`
- Modify: `astro.config.mjs`
- Create: `tests/legacy-article-redirects.test.ts`

**Interfaces:**
- Produces: `LEGACY_ARTICLE_REDIRECTS: Record<string, string>`，供 Astro 配置和回归测试共用。
- Consumes: 三个被合并文章的现有 slug 与三个目标讲义 slug。

- [ ] **Step 1: 写出失败的跳转映射测试**

  创建 `tests/legacy-article-redirects.test.ts`：

  ```ts
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
  ```

- [ ] **Step 2: 运行测试，确认它因映射模块缺失而失败**

  Run: `npm test -- tests/legacy-article-redirects.test.ts`

  Expected: FAIL，错误包含 `Cannot find module '../src/content/legacy-article-redirects'`。

- [ ] **Step 3: 创建共享映射并接入 Astro 配置**

  创建 `src/content/legacy-article-redirects.ts`：

  ```ts
  export const LEGACY_ARTICLE_REDIRECTS = {
    "/articles/多元思维模型-把知识挂上格栅/": "/articles/思维模型讲义01-为什么不能只拿一把锤子/",
    "/articles/概率赔率期望值-把赌注押在错价上/": "/articles/思维模型讲义02-数学不是公式而是判断力/",
    "/articles/lollapalooza叠加效应-二加二不止等于四/": "/articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论/"
  } as const;
  ```

  将 `astro.config.mjs` 改为：

  ```js
  import { defineConfig } from "astro/config";
  import { LEGACY_ARTICLE_REDIRECTS } from "./src/content/legacy-article-redirects";

  export default defineConfig({
    output: "static",
    site: "https://munger.ayaseeri.com",
    redirects: LEGACY_ARTICLE_REDIRECTS
  });
  ```

- [ ] **Step 4: 运行测试与静态检查，确认通过**

  Run: `npm test -- tests/legacy-article-redirects.test.ts && npx astro check`

  Expected: PASS，Astro 配置可加载 TypeScript 映射且没有诊断错误。

- [ ] **Step 5: 提交跳转支持**

  ```bash
  git add src/content/legacy-article-redirects.ts astro.config.mjs tests/legacy-article-redirects.test.ts
  git commit -m "feat: redirect merged thought-method articles"
  ```

### Task 2: 迁移栏目并固定 21 篇阅读顺序

**Files:**
- Modify: `src/content/site.ts`
- Modify: `tests/relations.test.ts`
- Modify: `tests/navigation.test.ts`
- Modify: `articles/跨学科普世智慧-把各学科的大思想综合起来.md`
- Modify: `articles/逆向思维-反过来想总是反过来想.md`
- Modify: `articles/检查清单-像飞行员一样起飞前逐项核对.md`
- Modify: `articles/客观与理性-把追求理性当作一种道德义务.md`
- Modify: `articles/常识-并不常见的判断力.md`
- Modify: `articles/终身学习-每天醒来都比昨天聪明一点.md`

**Interfaces:**
- Consumes: `TOPICS`、`loadArticles()`、`compareArticlesForDisplay()` 与 YAML `order`。
- Produces: 唯一的“思维模型讲义”主题；六篇补充课分别为 order 16–21。

- [ ] **Step 1: 写出失败的栏目和排序回归测试**

  在 `tests/relations.test.ts` 添加：

  ```ts
  import { loadArticles } from "../src/lib/corpus";

  it("keeps only the 21-part thinking-model lecture curriculum", () => {
    const lectures = loadArticles()
      .filter((article) => article.category === "思维模型讲义")
      .sort(compareArticlesForDisplay);

    expect(TOPICS.some((topic) => topic.title === "思维方法")).toBe(false);
    expect(lectures).toHaveLength(21);
    expect(lectures.map((article) => article.order)).toEqual(Array.from({ length: 21 }, (_, index) => index + 1));
    expect(lectures.slice(15).map((article) => article.keyword)).toEqual([
      "跨学科 / 普世智慧",
      "逆向思维 / 反过来想",
      "检查清单",
      "客观与理性",
      "常识",
      "终身学习"
    ]);
  });
  ```

  在现有主题顺序断言中删除“思维方法”，并将“思维模型讲义”保留在原有位置。

- [ ] **Step 2: 运行测试，确认它因旧主题与旧 frontmatter 而失败**

  Run: `npm test -- tests/relations.test.ts tests/navigation.test.ts`

  Expected: FAIL，主题仍包含“思维方法”，且讲义文章数为 15，补充课没有 `order`。

- [ ] **Step 3: 更新主题定义和六篇补充课 frontmatter**

  在 `src/content/site.ts` 删除 slug 为 `thinking-methods` 的整个主题对象；将 `mental-model-lectures` 的 description 更新为：

  ```ts
  description: "从多元模型到判断纪律的二十一课：十五篇主线讲义与六篇补充课。",
  keywords: ["铁锤", "数学", "概率", "会计", "工程", "心理学", "竞争", "投资", "跨学科", "逆向思维", "检查清单"]
  ```

  在六篇补充课的 YAML 内，将 `category: 思维方法` 替换为 `category: 思维模型讲义`，并在 category 下一行设置：

  ```yaml
  order: 16
  ```

  至

  ```yaml
  order: 21
  ```

  顺序严格按本任务文件列表的六个文章路径。保留每篇 `title`、`keyword`、正文、来源和现有 slug 不变。

- [ ] **Step 4: 运行分类和排序测试，确认通过**

  Run: `npm test -- tests/relations.test.ts tests/navigation.test.ts`

  Expected: PASS；测试中的主题列表没有“思维方法”，讲义阅读顺序为 1–21。

- [ ] **Step 5: 提交栏目迁移**

  ```bash
  git add src/content/site.ts tests/relations.test.ts tests/navigation.test.ts articles/跨学科普世智慧-把各学科的大思想综合起来.md articles/逆向思维-反过来想总是反过来想.md articles/检查清单-像飞行员一样起飞前逐项核对.md articles/客观与理性-把追求理性当作一种道德义务.md articles/常识-并不常见的判断力.md articles/终身学习-每天醒来都比昨天聪明一点.md
  git commit -m "feat: merge thought-method articles into lectures"
  ```

### Task 3: 吸收三篇重复正文并删除旧文章

**Files:**
- Create: `docs/article-production/state/thinking-model-lecture-merge-audit.md`
- Modify: `tests/corpus.test.ts`
- Modify: `articles/思维模型讲义01-为什么不能只拿一把锤子.md`
- Modify: `articles/思维模型讲义02-数学不是公式而是判断力.md`
- Modify: `articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论.md`
- Delete: `articles/多元思维模型-把知识挂上格栅.md`
- Delete: `articles/概率赔率期望值-把赌注押在错价上.md`
- Delete: `articles/Lollapalooza叠加效应-二加二不止等于四.md`

**Interfaces:**
- Consumes: 三篇源文章的 `出处索引` 与独有段落。
- Produces: 三篇有完整正文覆盖的目标讲义；`loadArticles()` 不再返回三个旧 slug。

- [ ] **Step 1: 写出失败的正文覆盖与删除测试**

  在 `tests/corpus.test.ts` 添加：

  ```ts
  it("absorbs unique content from the three removed thought-method articles", () => {
    const articles = loadArticles();
    const lecture01 = articles.find((article) => article.slug === "思维模型讲义01-为什么不能只拿一把锤子");
    const lecture02 = articles.find((article) => article.slug === "思维模型讲义02-数学不是公式而是判断力");
    const lecture15 = articles.find((article) => article.slug === "思维模型讲义15-合奏效应多个模型同时指向同一个结论");

    expect(lecture01?.body).toContain("可口可乐案例");
    expect(lecture01?.body).toContain("西科金融股东会讲话》2002");
    expect(lecture02?.body).toContain("1962 年油田开采权");
    expect(lecture02?.body).toContain("风险不是报价波动");
    expect(lecture15?.body).toContain("储贷行业危机");
    expect(lecture15?.body).toContain("2021 年谈巴菲特成功");
    expect(articles.map((article) => article.slug)).not.toContain("多元思维模型-把知识挂上格栅");
    expect(articles.map((article) => article.slug)).not.toContain("概率赔率期望值-把赌注押在错价上");
    expect(articles.map((article) => article.slug)).not.toContain("lollapalooza叠加效应-二加二不止等于四");
  });
  ```

- [ ] **Step 2: 运行测试，确认它因尚未合并正文与旧文件仍存在而失败**

  Run: `npm test -- tests/corpus.test.ts`

  Expected: FAIL，三个新增正文标记尚不存在，且三个旧 slug 仍由 `loadArticles()` 返回。

- [ ] **Step 3: 创建逐项正文合并核对表**

  创建 `docs/article-production/state/thinking-model-lecture-merge-audit.md`，使用下表作为完整核对项；每项在目标正文落地后标记为 `[x]` 并写入实际章节名：

  | 源文章 | 必须吸收的独有内容 | 目标位置 |
  |---|---|---|
  | 多元思维模型 | 2002 年西科“不同公司需要不同核查清单”引文；可口可乐的规模、社会认同、品牌和未利用提价能力四模型案例；“跨学科不是反专精”的边界 | 讲义 01 的跨学科、落到实处、边界章节 |
  | 概率·赔率·期望值 | 1962 年油田开采权案例；等待机会与止赎潮的区分；“风险不是报价波动，而是永久性损失、杠杆清零和能力圈外下注”的边界；2023 CNBC 与《芒格主义》来源 | 讲义 02 的赔率案例、落到实处、边界章节 |
  | Lollapalooza 叠加效应 | 1989 储贷行业危机的负向叠加案例；2021 年伯克希尔为典型 Lollapalooza 的更新；对“合力”虚假承诺的边界；1989、1998、2021 与《芒格主义》来源 | 讲义 15 的成功与失败、边界章节 |

- [ ] **Step 4: 合并正文、来源与引用数**

  修改三个目标讲义而非复制整篇旧文章：

  - 在讲义 01 的“落到实处”章节增加 `### 可口可乐案例：四种模型如何共同工作`，依次解释规模优势、社会认同与巴甫洛夫联想、品牌/商标、未利用提价能力；保留 2002 年西科的“不同公司需要不同核查清单”引文，并在“边界与误读”明确多学科是对专精的补充，不是“什么都要懂”。将 2017 年每日期刊与 2002 年西科资料加入 YAML `sources` 和 `出处索引`。
  - 在讲义 02 的“落到实处”章节增加 `### 1962 年油田开采权：等待之外还要识别制度缝隙`，保留一千美元首付款与五十多年现金流的案例；在“边界与误读”增加 `### 风险不是报价波动`，明确永久性损失、杠杆清零与能力圈外下注是先于赔率的约束。将 2023 CNBC 与《芒格主义》加入 YAML `sources` 和 `出处索引`。
  - 在讲义 15 的“成功和失败都能被解释”章节加入 `### 储贷行业危机：负向因素如何相互锁死`，以政治诉求、利率限制与存款保险的叠加解释 1989 年危机；补入“2021 年谈巴菲特成功”中伯克希尔典型 Lollapalooza 的引文。在“边界与误读”加入“合力存在，但不能接受没有逐项证据的合力承诺”，并把 1989、1998、2021 与《芒格主义》加入 YAML `sources` 和 `出处索引`。

  每次新增或保留 blockquote 后，以 `python3 tools/check_article.py <目标文件>` 重新计算真实引用数，并把 YAML `quote_count` 改为工具输出的 `引用数`。正文只保留经逐字核验的引用。

- [ ] **Step 5: 删除三篇旧 Markdown 并完成核对表**

  在核对表的全部九项均标记 `[x]` 后，删除三个源文件。确认 `loadArticles()` 只返回 21 篇“思维模型讲义”文章，旧 URL 由 Task 1 的静态跳转承担。

- [ ] **Step 6: 运行正文测试与逐篇来源核验**

  Run:

  ```bash
  npm test -- tests/corpus.test.ts
  python3 tools/check_article.py articles/思维模型讲义01-为什么不能只拿一把锤子.md
  python3 tools/check_article.py articles/思维模型讲义02-数学不是公式而是判断力.md
  python3 tools/check_article.py articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论.md
  ```

  Expected: 所有命令 PASS；三个目标讲义的引用数、来源数、引用逐字核验与 frontmatter `quote_count` 一致。

- [ ] **Step 7: 提交内容合并**

  ```bash
  git add docs/article-production/state/thinking-model-lecture-merge-audit.md tests/corpus.test.ts articles/思维模型讲义01-为什么不能只拿一把锤子.md articles/思维模型讲义02-数学不是公式而是判断力.md articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论.md
  git add -u articles/多元思维模型-把知识挂上格栅.md articles/概率赔率期望值-把赌注押在错价上.md articles/Lollapalooza叠加效应-二加二不止等于四.md
  git commit -m "feat: consolidate thinking model lectures"
  ```

### Task 4: 验证合并后的站点和静态跳转

**Files:**
- Verify only: `astro.config.mjs`, `src/content/site.ts`, `src/content/legacy-article-redirects.ts`, `articles/`, `tests/`

**Interfaces:**
- Consumes: 三项已提交的迁移、跳转与正文合并。
- Produces: 可构建的 21 篇讲义主题页、无“思维方法”侧栏和三个静态跳转页面。

- [ ] **Step 1: 检查本功能的空白错误**

  Run: `git diff --check main..HEAD`

  Expected: 无输出。

- [ ] **Step 2: 执行完整检查**

  Run: `npm run check`

  Expected: 内容验证、`astro check`、Vitest 和 Astro build 全部 exit code 0。

- [ ] **Step 3: 检查构建产物**

  Run:

  ```bash
  test "$(rg -o '/articles/思维模型讲义[^\"<]*/' dist/topics/mental-model-lectures/index.html | sort -u | wc -l | tr -d ' ')" = "15"
  test "$(rg -o '/articles/(跨学科普世智慧|逆向思维|检查清单|客观与理性|常识|终身学习)[^\"<]*/' dist/topics/mental-model-lectures/index.html | sort -u | wc -l | tr -d ' ')" = "6"
  ! rg -q '思维方法' dist/topics/index.html
  rg -q 'http-equiv="refresh"' dist/articles/多元思维模型-把知识挂上格栅/index.html
  rg -q '思维模型讲义01-为什么不能只拿一把锤子' dist/articles/多元思维模型-把知识挂上格栅/index.html
  rg -q '思维模型讲义02-数学不是公式而是判断力' dist/articles/概率赔率期望值-把赌注押在错价上/index.html
  rg -q '思维模型讲义15-合奏效应多个模型同时指向同一个结论' dist/articles/lollapalooza叠加效应-二加二不止等于四/index.html
  ```

  Expected: exit code 0；主题页有 15 篇主线和 6 篇补充课，主题索引/侧栏没有“思维方法”，三个旧地址均输出静态跳转页面。

- [ ] **Step 4: 汇报内容核对和合并证据**

  报告 21 篇最终文章、三篇移除文章、三条跳转、三个 `check_article.py` PASS 输出、`npm run check` 输出及功能提交哈希。
