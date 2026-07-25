# 思维模型讲义二次合并 Implementation Plan

**状态（2026-07-25）：已完成。** Task 1 至 Task 8 均已执行；下方旧文件名保留各阶段实际迁移顺序，最终验证命令已按构建产物更新。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 21 篇“思维模型讲义”合并、清洗为 12 篇标题统一的课程文章，同时保留旧关键词入口和旧 URL。

**Architecture:** 先给文章模型增加关键词别名，再把九组合并内容写入 12 个目标文件，源文件暂时保留。所有目标正文通过逐字引文核验和 `stop-slop` 人工审校后，一次性执行文件重命名、源文件删除、排序更新和静态跳转迁移。

**Tech Stack:** Astro 4、TypeScript、Vitest、Markdown/YAML frontmatter、gray-matter、现有 `tools/check_article.py`。

## Global Constraints

- 最终只保留 12 篇 `category: 思维模型讲义` 的文章，`order` 为 1 至 12。
- 标题必须匹配 `^思维模型讲义\d{2}：[^：]+$`，每个标题只使用一个全角冒号。
- 文件名采用 `思维模型讲义NN-主题.md`，不使用标题中的逗号和冒号。
- 芒格引文保持逐字原文，`stop-slop` 只约束作者叙述。
- 每篇至少 12 条引文、至少 4 个来源，`quote_count` 等于正文实际引用数。
- 合并内容按定义、机制、案例、反例、边界和来源覆盖，不做首尾拼接。
- 旧 URL 直接跳到最终 URL，不允许跳转链。
- 不修改 `thinking-grids/`、`shareholders/`、`speech/`、`li-lu/` 和 Seeking Wisdom 正文。

## File Structure

- `src/lib/markdown.ts`：声明 frontmatter 的 `aliases` 字段。
- `src/lib/corpus.ts`：把 `aliases` 加载到 `KnowledgeArticle`。
- `src/lib/relations.ts`：统一提供文章主关键词与别名，供来源匹配使用。
- `src/pages/articles/[slug].astro`、`src/pages/sources/[slug].astro`：把主关键词和别名交给 Markdown 自动链接器。
- `articles/*.md`：保存 12 篇最终讲义。
- `docs/article-production/state/thinking-model-lecture-second-merge-audit.md`：记录合并覆盖、删减理由和 `stop-slop` 评分。
- `src/content/legacy-article-redirects.ts`：保存 23 条旧文章地址到最终文章的直接跳转。
- `src/content/site.ts`：保存“十二课”栏目描述。
- `docs/article-production/reference/article-index.md`：保存 12 篇新目录，不再保留“思维方法”旧章节。

---

### Task 1: 支持合并文章的关键词别名

**Files:**
- Modify: `src/lib/markdown.ts`
- Modify: `src/lib/corpus.ts`
- Modify: `src/lib/relations.ts`
- Modify: `src/pages/articles/[slug].astro`
- Modify: `src/pages/sources/[slug].astro`
- Test: `tests/corpus.test.ts`
- Test: `tests/relations.test.ts`
- Test: `tests/navigation.test.ts`
- Test: `tests/source-page.test.ts`

**Interfaces:**
- Consumes: YAML `aliases?: string[]`。
- Produces: `KnowledgeArticle.aliases: string[]` 与 `articleKeywords(article): string[]`。

- [x] **Step 1: 为 frontmatter 和 loader 写失败测试**

在 `tests/corpus.test.ts` 增加：

```ts
it("loads article keyword aliases", () => {
  const lecture = loadArticles().find((article) => article.title.startsWith("思维模型讲义01"));
  expect(lecture?.aliases).toEqual(expect.arrayContaining(["铁锤人综合症"]));
});
```

在 `tests/relations.test.ts` 的所有 `KnowledgeArticle` fixtures 增加 `aliases: []`，并增加：

```ts
it("matches aliases while returning one article", () => {
  const lecture = {
    ...articles[2],
    keyword: "多元思维模型",
    aliases: ["铁锤人综合症", "跨学科智慧"],
    category: "思维模型讲义"
  } satisfies KnowledgeArticle;
  const source = { ...sources[0], body: "铁锤人综合症与跨学科智慧" } satisfies OriginalSource;
  expect(mentionedArticlesForSource(source, [lecture])).toEqual([lecture]);
});
```

- [x] **Step 2: 运行测试并确认失败**

Run: `npx vitest run tests/corpus.test.ts tests/relations.test.ts`

Expected: FAIL，提示 `aliases` 不存在或讲义 01 尚未声明别名。

- [x] **Step 3: 实现别名数据模型**

在 `ArticleFrontMatter` 增加 `aliases?: string[];`，在 `KnowledgeArticle` 增加 `aliases: string[];`，并在 `loadArticles()` 返回值中增加：

```ts
aliases: Array.isArray(parsed.data.aliases) ? parsed.data.aliases : [],
```

当前讲义 01 frontmatter 临时增加：

```yaml
aliases:
  - 铁锤人综合症
```

所有测试中的 `KnowledgeArticle` fixtures 增加 `aliases: []`。

- [x] **Step 4: 实现统一关键词读取和来源匹配**

在 `src/lib/relations.ts` 增加：

```ts
export function articleKeywords(article: KnowledgeArticle): string[] {
  return [...new Set([article.keyword, ...article.aliases].map((keyword) => keyword.trim()).filter(Boolean))];
}
```

把 `mentionedArticlesForSource()` 中的单关键词判断改为：

```ts
const claimedKeywords = new Set<string>();

return [...articles]
  .sort(compareArticlesForDisplay)
  .filter((article) => {
    const keywords = articleKeywords(article);
    const match = keywords.find((keyword) => source.body.includes(keyword) && !claimedKeywords.has(keyword));
    if (!match) {
      return false;
    }
    keywords.forEach((keyword) => claimedKeywords.add(keyword));
    return true;
  });
```

- [x] **Step 5: 把别名交给两类阅读页的自动链接器**

两处页面都从 `src/lib/relations.ts` 导入 `articleKeywords`，并把 `keywordLinks` 改为：

```ts
const keywordLinks = allArticles.flatMap((item) =>
  articleKeywords(item).map((keyword) => ({
    keyword,
    href: `/articles/${item.slug}/`
  }))
);
```

来源页使用当地变量名 `articles` 替换 `allArticles`。更新 `tests/source-page.test.ts` 中对应源码断言。

- [x] **Step 6: 运行别名相关测试和类型检查**

Run: `npx vitest run tests/corpus.test.ts tests/relations.test.ts tests/markdown.test.ts tests/source-page.test.ts tests/navigation.test.ts && npx astro check`

Expected: 所有测试 PASS，Astro check 报告 0 errors。

- [x] **Step 7: 提交别名支持**

```bash
git add src/lib/markdown.ts src/lib/corpus.ts src/lib/relations.ts src/pages/articles/'[slug].astro' src/pages/sources/'[slug].astro' tests/corpus.test.ts tests/relations.test.ts tests/navigation.test.ts tests/source-page.test.ts articles/思维模型讲义01-为什么不能只拿一把锤子.md
git commit -m "feat: preserve merged lecture keyword aliases"
```

### Task 2: 建立合并审计并整理课程基础与投资判断

**Files:**
- Create: `docs/article-production/state/thinking-model-lecture-second-merge-audit.md`
- Modify: `articles/思维模型讲义01-为什么不能只拿一把锤子.md`
- Modify: `articles/思维模型讲义02-数学不是公式而是判断力.md`
- Reference only: `articles/跨学科普世智慧-把各学科的大思想综合起来.md`
- Reference only: `articles/思维模型讲义14-投资模型股市像彩池投注.md`
- Test: `tests/corpus.test.ts`

**Interfaces:**
- Consumes: 四篇现有正文与原始语料。
- Produces: 新讲义 01、02 的完整正文和全项目内容覆盖表；源文章此时仍保留。

- [x] **Step 1: 创建完整内容覆盖表**

创建审计文件，按下列行记录 `目标章节`、`状态`、`删减理由` 和五项 `stop-slop` 分数：

| 目标 | 必须覆盖的独有内容 |
|---|---|
| 01 | 铁锤人综合症；思维模型格栅；专业化与跨学科的边界；可口可乐多模型案例；核查清单随公司变化 |
| 02 | 复利；排列组合；概率与赔率；彩池投注；市场部分有效；等待与重仓；1962 年油田；永久损失与杠杆边界 |
| 04 | 工程安全边际；后备系统；质量控制；断裂点；临界质量；非线性；桥梁与投资案例 |
| 06 | 心理学总论；奖励与惩罚；激励偏差；社会认同；巴甫洛夫联想；可口可乐心理机制；组合误判 |
| 07 | 成本、信息、渠道与分工的规模优势；官僚主义、责任扩散和护城河消失的规模劣势 |
| 08 | 普通商品、品牌和特许经营；技术节省归属；纺织机；竞争性毁灭；冲浪模型 |
| 10 | 反过来想；避免失败；清单的外部记忆作用；飞行员与投资清单；清单边界 |
| 11 | 理性作为道德责任；反面证据；自我纠错；意识形态；有组织的常识；会计与衍生品反例 |

审计文件还列出独立整理的 03、05、09、12，并为每篇预留 Directness、Rhythm、Trust、Authenticity、Density 五个整数评分栏。

- [x] **Step 2: 给讲义 01、02 写内容断言**

在 `tests/corpus.test.ts` 增加或更新：

```ts
expect(lecture01?.body).toContain("专业化思维");
expect(lecture01?.body).toContain("可口可乐案例");
expect(lecture02?.body).toContain("彩池投注");
expect(lecture02?.body).toContain("1962 年油田开采权");
expect(lecture02?.body).toContain("永久性损失");
```

- [x] **Step 3: 重写讲义 01**

以原 01 为目标。合入跨学科文章的专业化生计、学科孤岛、整合能力和普世智慧材料。删除两篇都出现的格栅、铁锤与 2016 年股东会引文。正文保留八个职责明确的章节。frontmatter 暂时保留旧标题、文件名和 `order: 1`，主关键词改为 `多元思维模型`，别名为 `铁锤人综合症`、`跨学科 / 普世智慧`。

- [x] **Step 4: 重写讲义 02**

以原 02 为目标。把原 14 的彩池投注、赔率随下注变化、市场部分有效和等待内容放入概率应用章节。删除重复的“数学没有万能公式”和稀缺机会引文。保留复利、排列组合、油田、能力圈与杠杆边界。frontmatter 暂时保留旧标题、文件名和 `order: 2`，别名为 `投资模型`。

- [x] **Step 5: 清洗作者叙述并记录评分**

逐段应用 `stop-slop`：删除元叙述、二元转折、三项排比、段尾口号、无主语判断和空泛评价。引文与 `——《来源》` 不改。把两篇五项评分写进审计文件，每篇总分必须至少 35。

- [x] **Step 6: 核验并提交**

```bash
python3 tools/check_article.py articles/思维模型讲义01-为什么不能只拿一把锤子.md
python3 tools/check_article.py articles/思维模型讲义02-数学不是公式而是判断力.md
npx vitest run tests/corpus.test.ts
git add docs/article-production/state/thinking-model-lecture-second-merge-audit.md tests/corpus.test.ts articles/思维模型讲义01-为什么不能只拿一把锤子.md articles/思维模型讲义02-数学不是公式而是判断力.md
git commit -m "content: merge lecture foundations and investment judgment"
```

Expected: 两个脚本和测试均 PASS，提交成功。

### Task 3: 合并硬科学与误判心理学

**Files:**
- Modify: `articles/思维模型讲义04-工程学安全边际与后备系统.md`
- Modify: `articles/思维模型讲义07-心理学人脑不是理性机器.md`
- Modify: `docs/article-production/state/thinking-model-lecture-second-merge-audit.md`
- Reference only: `articles/思维模型讲义05-物理学临界点和非线性世界.md`
- Reference only: `articles/思维模型讲义08-激励机制告诉我激励我告诉你结果.md`
- Reference only: `articles/思维模型讲义09-社会认同与巴甫洛夫联想.md`
- Test: `tests/corpus.test.ts`

**Interfaces:**
- Consumes: 原 04、05、07、08、09。
- Produces: 新讲义 04、06 的正文，旧源文件暂时保留。

- [x] **Step 1: 写内容覆盖断言**

```ts
expect(hardScience?.body).toContain("后备系统");
expect(hardScience?.body).toContain("临界点");
expect(hardScience?.body).toContain("非线性");
expect(psychology?.body).toContain("激励机制");
expect(psychology?.body).toContain("社会认同");
expect(psychology?.body).toContain("巴甫洛夫联想");
```

- [x] **Step 2: 重写硬科学目标文**

以原 04 为目标，按工程容错、物理边界、投资应用和适用边界组织内容。保留安全边际、后备系统、质量控制、断裂点、临界质量和非线性各自的解释职责。相同的 1994 年硬科学总论只引一次。别名设为 `物理学模型`。

- [x] **Step 3: 重写误判心理学目标文**

以原 07 为目标。先解释大脑的系统误判，再用激励、社会认同和巴甫洛夫联想展开。可口可乐只承担心理机制案例。删除三篇之间重复的心理学重要性、富兰克林利益箴言和来源署名。别名为 `激励机制`、`社会认同与巴甫洛夫联想`、`社会认同`、`巴甫洛夫联想`。

- [x] **Step 4: 完成 `stop-slop` 审校和核验**

检查每段的主语、证据和因果关系。把广告商、消费者或同伴写成行动主体。两篇评分均达到 35。

```bash
python3 tools/check_article.py articles/思维模型讲义04-工程学安全边际与后备系统.md
python3 tools/check_article.py articles/思维模型讲义07-心理学人脑不是理性机器.md
npx vitest run tests/corpus.test.ts
```

Expected: 两篇文章和测试 PASS。

- [x] **Step 5: 提交硬科学与心理学合并**

```bash
git add docs/article-production/state/thinking-model-lecture-second-merge-audit.md tests/corpus.test.ts articles/思维模型讲义04-工程学安全边际与后备系统.md articles/思维模型讲义07-心理学人脑不是理性机器.md
git commit -m "content: merge hard science and psychology lectures"
```

### Task 4: 合并规模效应与竞争技术

**Files:**
- Modify: `articles/思维模型讲义10-规模优势大为什么会变强.md`
- Modify: `articles/思维模型讲义12-竞争模型为什么有些行业赚钱.md`
- Modify: `docs/article-production/state/thinking-model-lecture-second-merge-audit.md`
- Reference only: `articles/思维模型讲义11-规模劣势大为什么会变蠢.md`
- Reference only: `articles/思维模型讲义13-技术模型新技术帮你还是毁掉你.md`
- Test: `tests/corpus.test.ts`

**Interfaces:**
- Consumes: 原 10 至 13。
- Produces: 新讲义 07、08 的正文，旧源文件暂时保留。

- [x] **Step 1: 写内容覆盖断言**

```ts
expect(scale?.body).toContain("规模优势");
expect(scale?.body).toContain("规模劣势");
expect(scale?.body).toContain("官僚");
expect(competition?.body).toContain("普通商品");
expect(competition?.body).toContain("纺织机");
expect(competition?.body).toContain("竞争性毁灭");
```

- [x] **Step 2: 重写规模效应目标文**

以原 10 为目标。前半解释成本、信息、渠道、专业分工和社会认同带来的规模优势；后半解释层级、流程、责任扩散和旧护城河消失带来的规模劣势。主关键词改为 `规模效应`，别名为 `规模优势`、`规模劣势`。

- [x] **Step 3: 重写竞争技术目标文**

以原 12 为目标。先区分普通商品、品牌和特许经营，再说明技术节省会流向客户、员工或股东中的哪一方。保留纺织机、竞争性毁灭和冲浪模型。删除两篇共享的 1994 年来源总论。别名为 `技术模型`。

- [x] **Step 4: 完成 `stop-slop` 审校和核验**

删除“大不是结论”“行业比努力更狠”等口号式短句，改为带主体、条件和结果的陈述。记录五项评分。

```bash
python3 tools/check_article.py articles/思维模型讲义10-规模优势大为什么会变强.md
python3 tools/check_article.py articles/思维模型讲义12-竞争模型为什么有些行业赚钱.md
npx vitest run tests/corpus.test.ts
```

Expected: 两篇文章和测试 PASS。

- [x] **Step 5: 提交商业模型合并**

```bash
git add docs/article-production/state/thinking-model-lecture-second-merge-audit.md tests/corpus.test.ts articles/思维模型讲义10-规模优势大为什么会变强.md articles/思维模型讲义12-竞争模型为什么有些行业赚钱.md
git commit -m "content: merge scale competition and technology lectures"
```

### Task 5: 合并逆向清单与理性常识

**Files:**
- Modify: `articles/逆向思维-反过来想总是反过来想.md`
- Modify: `articles/客观与理性-把追求理性当作一种道德义务.md`
- Modify: `docs/article-production/state/thinking-model-lecture-second-merge-audit.md`
- Reference only: `articles/检查清单-像飞行员一样起飞前逐项核对.md`
- Reference only: `articles/常识-并不常见的判断力.md`
- Test: `tests/corpus.test.ts`

**Interfaces:**
- Consumes: 四篇补充课。
- Produces: 新讲义 10、11 的正文，旧源文件暂时保留。

- [x] **Step 1: 写内容覆盖断言**

```ts
expect(inversion?.body).toContain("检查清单");
expect(inversion?.body).toContain("飞行员");
expect(rationality?.body).toContain("道德追求");
expect(rationality?.body).toContain("有组织的常识");
expect(rationality?.body).toContain("反面证据");
```

- [x] **Step 2: 重写逆向思维目标文**

以逆向思维文章为目标。用逆向思维找失败路径，用检查清单在行动前逐项执行，两种方法分工清楚。保留飞行员、投资核查和清单边界。主关键词改为 `逆向思维`，别名为 `逆向思维 / 反过来想`、`反过来想`、`检查清单`。

- [x] **Step 3: 重写理性常识目标文**

以客观与理性文章为目标。理性章节保留道德责任、反面证据、自我纠错和意识形态；常识章节解释读者如何用有组织的基础知识检查复杂模型。保留会计、衍生品或建筑中的具体反例，删除泛泛的“现实感”同义段落。别名为 `常识`。

- [x] **Step 4: 完成 `stop-slop` 审校和核验**

删掉“理性不是天赋，是欠债”等刻意金句，使用芒格的具体行为和原话支撑结论。记录五项评分。

```bash
python3 tools/check_article.py articles/逆向思维-反过来想总是反过来想.md
python3 tools/check_article.py articles/客观与理性-把追求理性当作一种道德义务.md
npx vitest run tests/corpus.test.ts
```

Expected: 两篇文章和测试 PASS。

- [x] **Step 5: 提交判断纪律合并**

```bash
git add docs/article-production/state/thinking-model-lecture-second-merge-audit.md tests/corpus.test.ts articles/逆向思维-反过来想总是反过来想.md articles/客观与理性-把追求理性当作一种道德义务.md
git commit -m "content: merge inversion checklist rationality and common sense"
```

### Task 6: 整理四篇独立讲义并复核全部目标文

**Files:**
- Modify: `articles/思维模型讲义03-会计是商业语言但不是商业真相.md`
- Modify: `articles/思维模型讲义06-生物学把经济看成生态系统.md`
- Modify: `articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论.md`
- Modify: `articles/终身学习-每天醒来都比昨天聪明一点.md`
- Modify: `docs/article-production/state/thinking-model-lecture-second-merge-audit.md`

**Interfaces:**
- Consumes: 四篇不参与合并的目标文和 Task 2 至 5 的八篇目标文。
- Produces: 12 篇通过 `stop-slop` 与引文核验的最终正文。

- [x] **Step 1: 整理讲义 03**

保留会计语言、EBITDA、衍生品会计、股票期权和保守会计材料。合并重复的“会计不等于经济现实”段落。作者叙述用公司、报表项目和决策者作主语。

- [x] **Step 2: 整理生物学讲义**

保留生态位、进化、死亡和市场适应速度。删除森林比喻、物种比喻的重复解释。把与规模劣势重复的护城河消失材料留给新讲义 07，本篇只说明生态系统中的淘汰机制。

- [x] **Step 3: 整理合奏效应讲义**

保留正负叠加、伯克希尔、储贷危机和虚假协同边界。删除与新讲义 01 重复的跨学科总论，以及与新讲义 06 重复的心理学倾向清单。

- [x] **Step 4: 整理终身学习讲义**

保留阅读、学习机器、观点更新和长期积累。删除“每天聪明一点”等重复口号，把学习行为写成具体习惯和纠错过程。

- [x] **Step 5: 对 12 篇做统一人工复核**

逐篇检查：标题下首段是否直接进入问题；每段是否有明确主语；是否出现元叙述、二元反转、三项排比、段尾金句、破折号或空泛判断；案例是否说明具体机制；结尾是否给出可执行问题。把 12 篇五项评分和总分写入审计文件，所有总分至少 35，所有覆盖项标为 `[x]`。

- [x] **Step 6: 核验四篇与全部目标文**

先核验四篇本任务文章，再用完整列表核验 12 个目标文件。

```bash
python3 tools/check_article.py articles/思维模型讲义03-会计是商业语言但不是商业真相.md
python3 tools/check_article.py articles/思维模型讲义06-生物学把经济看成生态系统.md
python3 tools/check_article.py articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论.md
python3 tools/check_article.py articles/终身学习-每天醒来都比昨天聪明一点.md
for file in \
  articles/思维模型讲义01-为什么不能只拿一把锤子.md \
  articles/思维模型讲义02-数学不是公式而是判断力.md \
  articles/思维模型讲义03-会计是商业语言但不是商业真相.md \
  articles/思维模型讲义04-工程学安全边际与后备系统.md \
  articles/思维模型讲义06-生物学把经济看成生态系统.md \
  articles/思维模型讲义07-心理学人脑不是理性机器.md \
  articles/思维模型讲义10-规模优势大为什么会变强.md \
  articles/思维模型讲义12-竞争模型为什么有些行业赚钱.md \
  articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论.md \
  articles/逆向思维-反过来想总是反过来想.md \
  articles/客观与理性-把追求理性当作一种道德义务.md \
  articles/终身学习-每天醒来都比昨天聪明一点.md; do
  python3 tools/check_article.py "$file" || exit 1
done
```

Expected: 每篇输出 PASS；审计表没有未勾选项或低于 35 的评分。

- [x] **Step 7: 提交独立讲义整理**

```bash
git add docs/article-production/state/thinking-model-lecture-second-merge-audit.md articles/思维模型讲义03-会计是商业语言但不是商业真相.md articles/思维模型讲义06-生物学把经济看成生态系统.md articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论.md articles/终身学习-每天醒来都比昨天聪明一点.md
git commit -m "content: edit standalone thinking model lectures"
```

### Task 7: 切换 12 篇最终目录、别名和旧链接

**Files:**
- Rename: 12 个目标 Markdown 文件
- Delete: 9 个已吸收的 Markdown 文件
- Modify: `src/content/legacy-article-redirects.ts`
- Modify: `src/content/site.ts`
- Modify: `docs/article-production/reference/article-index.md`
- Modify: `tests/corpus.test.ts`
- Modify: `tests/relations.test.ts`
- Modify: `tests/legacy-article-redirects.test.ts`

**Interfaces:**
- Consumes: 12 篇已核验目标文、`articleKeywords()`。
- Produces: 正式的 12 篇课程与 23 条直接跳转。

- [x] **Step 1: 写最终目录失败测试**

在 `tests/relations.test.ts` 用以下断言替换 21 篇旧断言：

```ts
const lectures = loadArticles()
  .filter((article) => article.category === "思维模型讲义")
  .sort(compareArticlesForDisplay);

expect(lectures.map(({ order, title }) => [order, title])).toEqual([
  [1, "思维模型讲义01：多元思维模型与跨学科智慧"],
  [2, "思维模型讲义02：概率、赔率与投资判断"],
  [3, "思维模型讲义03：会计是商业语言，不是商业真相"],
  [4, "思维模型讲义04：硬科学思维，安全边际、后备系统与临界点"],
  [5, "思维模型讲义05：生物学思维，把经济看成生态系统"],
  [6, "思维模型讲义06：误判心理学，激励、社会认同与条件反射"],
  [7, "思维模型讲义07：规模效应，优势如何增强，组织如何变蠢"],
  [8, "思维模型讲义08：竞争与技术，行业利润最终归谁"],
  [9, "思维模型讲义09：合奏效应，多个模型如何共同作用"],
  [10, "思维模型讲义10：逆向思维与检查清单"],
  [11, "思维模型讲义11：客观、理性与常识"],
  [12, "思维模型讲义12：终身学习，让模型持续更新"]
]);
expect(lectures.every((article) => /^思维模型讲义\d{2}：[^：]+$/.test(article.title))).toBe(true);
```

Run: `npx vitest run tests/relations.test.ts`

Expected: FAIL，当前仍有 21 篇与旧标题。

- [x] **Step 2: 删除九个已吸收源文件**

先删除下列源文件，释放讲义 05、08、09 和 11 等目标编号，避免重命名冲突：

```text
articles/跨学科普世智慧-把各学科的大思想综合起来.md
articles/思维模型讲义14-投资模型股市像彩池投注.md
articles/思维模型讲义05-物理学临界点和非线性世界.md
articles/思维模型讲义08-激励机制告诉我激励我告诉你结果.md
articles/思维模型讲义09-社会认同与巴甫洛夫联想.md
articles/思维模型讲义11-规模劣势大为什么会变蠢.md
articles/思维模型讲义13-技术模型新技术帮你还是毁掉你.md
articles/检查清单-像飞行员一样起飞前逐项核对.md
articles/常识-并不常见的判断力.md
```

- [x] **Step 3: 重命名 12 个目标文件**

使用 `git mv` 得到以下最终文件：

```text
articles/思维模型讲义01-多元思维模型与跨学科智慧.md
articles/思维模型讲义02-概率赔率与投资判断.md
articles/思维模型讲义03-会计是商业语言但不是商业真相.md
articles/思维模型讲义04-硬科学思维安全边际后备系统与临界点.md
articles/思维模型讲义05-生物学思维把经济看成生态系统.md
articles/思维模型讲义06-误判心理学激励社会认同与条件反射.md
articles/思维模型讲义07-规模效应优势如何增强组织如何变蠢.md
articles/思维模型讲义08-竞争与技术行业利润最终归谁.md
articles/思维模型讲义09-合奏效应多个模型如何共同作用.md
articles/思维模型讲义10-逆向思维与检查清单.md
articles/思维模型讲义11-客观理性与常识.md
articles/思维模型讲义12-终身学习让模型持续更新.md
```

讲义 03 文件名不变。更新每篇 `title`、`order`、`keyword`、`aliases`、`quote_count` 和去重后的 `sources`。

- [x] **Step 4: 配置 23 条直接跳转**

把 `LEGACY_ARTICLE_REDIRECTS` 替换为以下完整对象：

```ts
export const LEGACY_ARTICLE_REDIRECTS = {
  "/articles/多元思维模型-把知识挂上格栅/": "/articles/思维模型讲义01-多元思维模型与跨学科智慧/",
  "/articles/概率赔率期望值-把赌注押在错价上/": "/articles/思维模型讲义02-概率赔率与投资判断/",
  "/articles/lollapalooza叠加效应-二加二不止等于四/": "/articles/思维模型讲义09-合奏效应多个模型如何共同作用/",
  "/articles/思维模型讲义01-为什么不能只拿一把锤子/": "/articles/思维模型讲义01-多元思维模型与跨学科智慧/",
  "/articles/跨学科普世智慧-把各学科的大思想综合起来/": "/articles/思维模型讲义01-多元思维模型与跨学科智慧/",
  "/articles/思维模型讲义02-数学不是公式而是判断力/": "/articles/思维模型讲义02-概率赔率与投资判断/",
  "/articles/思维模型讲义14-投资模型股市像彩池投注/": "/articles/思维模型讲义02-概率赔率与投资判断/",
  "/articles/思维模型讲义04-工程学安全边际与后备系统/": "/articles/思维模型讲义04-硬科学思维安全边际后备系统与临界点/",
  "/articles/思维模型讲义05-物理学临界点和非线性世界/": "/articles/思维模型讲义04-硬科学思维安全边际后备系统与临界点/",
  "/articles/思维模型讲义06-生物学把经济看成生态系统/": "/articles/思维模型讲义05-生物学思维把经济看成生态系统/",
  "/articles/思维模型讲义07-心理学人脑不是理性机器/": "/articles/思维模型讲义06-误判心理学激励社会认同与条件反射/",
  "/articles/思维模型讲义08-激励机制告诉我激励我告诉你结果/": "/articles/思维模型讲义06-误判心理学激励社会认同与条件反射/",
  "/articles/思维模型讲义09-社会认同与巴甫洛夫联想/": "/articles/思维模型讲义06-误判心理学激励社会认同与条件反射/",
  "/articles/思维模型讲义10-规模优势大为什么会变强/": "/articles/思维模型讲义07-规模效应优势如何增强组织如何变蠢/",
  "/articles/思维模型讲义11-规模劣势大为什么会变蠢/": "/articles/思维模型讲义07-规模效应优势如何增强组织如何变蠢/",
  "/articles/思维模型讲义12-竞争模型为什么有些行业赚钱/": "/articles/思维模型讲义08-竞争与技术行业利润最终归谁/",
  "/articles/思维模型讲义13-技术模型新技术帮你还是毁掉你/": "/articles/思维模型讲义08-竞争与技术行业利润最终归谁/",
  "/articles/思维模型讲义15-合奏效应多个模型同时指向同一个结论/": "/articles/思维模型讲义09-合奏效应多个模型如何共同作用/",
  "/articles/逆向思维-反过来想总是反过来想/": "/articles/思维模型讲义10-逆向思维与检查清单/",
  "/articles/检查清单-像飞行员一样起飞前逐项核对/": "/articles/思维模型讲义10-逆向思维与检查清单/",
  "/articles/客观与理性-把追求理性当作一种道德义务/": "/articles/思维模型讲义11-客观理性与常识/",
  "/articles/常识-并不常见的判断力/": "/articles/思维模型讲义11-客观理性与常识/",
  "/articles/终身学习-每天醒来都比昨天聪明一点/": "/articles/思维模型讲义12-终身学习让模型持续更新/"
} as const;
```

测试增加：

```ts
const sources = Object.keys(LEGACY_ARTICLE_REDIRECTS);
const targets = Object.values(LEGACY_ARTICLE_REDIRECTS);

expect(sources).toHaveLength(23);
expect(targets.every((target) => !sources.includes(target))).toBe(true);
```

再断言三个历史地址直接指向新 01、02、09，而非旧 01、02、15。

- [x] **Step 5: 更新栏目配置和文章索引**

`src/content/site.ts` 描述改为：

```ts
description: "从多元思维模型到终身学习的十二课，覆盖硬科学、误判心理学、商业判断与行动纪律。",
keywords: ["多元思维模型", "概率", "会计", "硬科学", "生物学", "误判心理学", "规模效应", "竞争", "技术", "逆向思维", "检查清单", "理性", "终身学习"]
```

删除 `docs/article-production/reference/article-index.md` 的“思维方法”章节，把“思维模型讲义”章节替换为 12 个最终标题、最终相对链接、各一条已核验引文和一条具体摘要。

- [x] **Step 6: 更新仓库内容断言并运行测试**

`tests/corpus.test.ts` 查找新 01、02、09，不再查找旧 15；断言九个源文件不在 `loadArticles()` 中。运行：

```bash
npx vitest run tests/corpus.test.ts tests/relations.test.ts tests/legacy-article-redirects.test.ts
```

Expected: 所有测试 PASS。

- [x] **Step 7: 对最终文件运行带重复检查的引文核验**

```bash
for file in articles/思维模型讲义{01,02,03,04,05,06,07,08,09,10,11,12}-*.md; do
  python3 tools/check_article.py --dup "$file" || exit 1
done
```

Expected: 12 篇都输出 PASS。人工复核每条重复 WARN；同一句在两个主题承担不同解释职责时记录到审计表，否则删除重复引用。

- [x] **Step 8: 提交最终目录迁移**

```bash
git add articles src/content/legacy-article-redirects.ts src/content/site.ts docs/article-production/reference/article-index.md docs/article-production/state/thinking-model-lecture-second-merge-audit.md tests/corpus.test.ts tests/relations.test.ts tests/legacy-article-redirects.test.ts
git commit -m "feat: publish twelve-part thinking model curriculum"
```

### Task 8: 完整验证构建产物

**Files:**
- Verify only: `articles/`
- Verify only: `src/content/legacy-article-redirects.ts`
- Verify only: `src/content/site.ts`
- Verify only: `docs/article-production/reference/article-index.md`
- Verify only: `dist/`

**Interfaces:**
- Consumes: Task 1 至 7 的全部提交。
- Produces: 可部署的 12 篇课程、旧链接跳转和验证记录。

- [x] **Step 1: 检查工作树和空白错误**

Run: `git status --short && git diff --check 543fef4..HEAD`

Expected: 工作树为空，`git diff --check` 无输出。

- [x] **Step 2: 执行完整门禁**

Run: `npm run check`

Expected: 内容校验、Astro check、Vitest 和 Astro build 全部 exit 0。

- [x] **Step 3: 检查主题页和标题格式**

```bash
test "$(rg -o '/articles/思维模型讲义[0-9]{2}-[^\"<]*/' dist/topics/mental-model-lectures/index.html | sort -u | wc -l | tr -d ' ')" = "12"
test "$(rg -o '思维模型讲义[0-9]{2}：' dist/topics/mental-model-lectures/index.html | sort -u | wc -l | tr -d ' ')" = "12"
! rg -q '^## 思维方法$' docs/article-production/reference/article-index.md
```

Expected: 三条命令 exit 0。

- [x] **Step 4: 检查代表性旧地址**

```bash
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const redirects = [
  ["dist/articles/跨学科普世智慧-把各学科的大思想综合起来/index.html", "/articles/思维模型讲义01-多元思维模型与跨学科智慧/"],
  ["dist/articles/思维模型讲义08-激励机制告诉我激励我告诉你结果/index.html", "/articles/思维模型讲义06-误判心理学激励社会认同与条件反射/"],
  ["dist/articles/检查清单-像飞行员一样起飞前逐项核对/index.html", "/articles/思维模型讲义10-逆向思维与检查清单/"],
  ["dist/articles/常识-并不常见的判断力/index.html", "/articles/思维模型讲义11-客观理性与常识/"]
];

for (const [file, expectedPath] of redirects) {
  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical || decodeURIComponent(new URL(canonical).pathname) !== expectedPath) {
    throw new Error(`${file} 未直达 ${expectedPath}`);
  }
}
NODE
```

Expected: 四条命令 exit 0，构建产物含最终目标地址。

- [x] **Step 5: 汇总最终证据**

报告 12 篇最终标题、9 个删除源文件、23 条跳转、12 个 `check_article.py --dup` PASS、`npm run check` PASS 和本功能提交哈希。若重复引用留下 WARN，逐条报告审计表中的保留理由。
