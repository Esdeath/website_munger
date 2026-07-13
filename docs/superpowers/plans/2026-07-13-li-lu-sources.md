# 李录演讲和访谈原文模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将外部李录目录中的全部 14 篇 Markdown 和 8 张图片纳入仓库，并在现有原文数据链路、左侧导航、首页、原文索引和单篇阅读页中增加“李录演讲和访谈”。

**Architecture:** 新增仓库内扁平语料目录 `li-lu/`，通过集中式 `SOURCE_DEFINITIONS` 描述三类原文的目录、类型和展示元数据。`loadOriginalSources()` 继续产出统一的 `OriginalSource[]`，所有页面和导航复用该配置；单篇页复用现有 `/sources/<slug>/` 路由，图片复用白名单动态路由。

**Tech Stack:** Astro 4、TypeScript、Node.js 文件系统 API、Vitest、Markdown、现有 remark 渲染管线。

## Global Constraints

- 必须采用李录目录中的全部 14 篇 Markdown，包括讲座笔记和纪念文章。
- 原始正文不得改写；只允许规范目标文件名和本地图片链接。
- 站点构建不得读取 `/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/`，该路径只作为一次性复制来源。
- 新目录固定为仓库根目录 `li-lu/`；新类型固定为 `li-lu`；显示名称固定为“李录演讲和访谈”。
- 14 篇 Markdown 扁平存放，8 张 PNG 统一存放在 `li-lu/images/`，重复图片名必须添加文章前缀。
- 不改动现有文章分类、文章生产语料清单、站点品牌或“不可为清单”数据来源。
- 保留用户现有未跟踪文件 `AGENTS.md`，不得暂存、修改或提交。
- 每项行为改动遵循 RED → GREEN；最终必须运行 `npm run check`。

## File Structure

| 文件 | 责任 |
| --- | --- |
| `li-lu/*.md` | 14 篇仓库内李录原文资料。 |
| `li-lu/images/*.png` | 8 张经文章前缀去重的本地图片。 |
| `src/lib/source-types.ts` | 三类原文的目录、类型、标签、首页标记和描述的唯一配置源。 |
| `src/lib/corpus.ts` | 从三个仓库目录读取 Markdown，生成统一 `OriginalSource[]`。 |
| `src/lib/navigation.ts` | 从统一配置构建左侧三组原文导航。 |
| `src/lib/relations.ts` | 计算同类型、同年份的“同类原文”。 |
| `src/lib/seo.ts` | 复用统一类型标签，输出 sitemap 与 LLM 索引。 |
| `src/pages/index.astro` | 从统一配置生成三张原文入口卡。 |
| `src/pages/sources/index.astro` | 从统一配置生成三个原文索引分区。 |
| `src/pages/sources/[slug].astro` | 显示正确类型名称并使用同类型相关推荐。 |
| `src/pages/[sourceDirectory]/images/[image].png.ts` | 为三个白名单图片目录生成静态 PNG 路由。 |
| `tests/corpus.test.ts` | 锁定 14 篇加载、标题年份和图片重写。 |
| `tests/navigation.test.ts` | 锁定第三个原文侧栏组及激活行为。 |
| `tests/relations.test.ts` | 锁定“同类原文”不跨类型。 |
| `tests/seo.test.ts` | 锁定李录类型标签、sitemap 和 LLM 索引。 |

---

### Task 1: 导入李录语料并扩展原文类型

**Files:**
- Create: `li-lu/*.md`
- Create: `li-lu/images/*.png`
- Create: `src/lib/source-types.ts`
- Modify: `src/lib/corpus.ts`
- Test: `tests/corpus.test.ts`

**Interfaces:**
- Produces: `SOURCE_DEFINITIONS`, `SOURCE_DIRECTORIES`, `SourceDirectory`, `SourceType`, `sourceTypeLabel(source)`。
- Produces: `loadOriginalSources(): OriginalSource[]`，其中李录资料的 `type` 为 `"li-lu"`。
- Consumes: 现有 `filePathToSlug()`、`parseMarkdownDocument()`、`rewriteRelativeImagePaths()` 行为。

- [ ] **Step 1: 写入失败的语料加载测试**

在 `tests/corpus.test.ts` 的 `loaders against repository content` 中加入：

```ts
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

it("rewrites Li Lu relative image paths to li-lu absolute paths", () => {
  const source = loadOriginalSources().find(
    (item) => item.filePath === "li-lu/李录：2006年哥伦比亚大学商学院演讲.md"
  );

  expect(source?.body).toContain("](/li-lu/images/2006-columbia-image.png)");
  expect(source?.body).not.toContain("](images/2006-columbia-image.png)");
});
```

- [ ] **Step 2: 运行测试并确认因功能缺失而失败**

Run: `npx vitest run tests/corpus.test.ts`

Expected: FAIL；李录资料数组长度为 `0`，而期望为 `14`。

- [ ] **Step 3: 一次性复制 14 篇 Markdown 和 8 张图片**

创建 `li-lu/images/`，将源文件复制为以下目标文件名：

```bash
mkdir -p li-lu/images
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2006年哥伦比亚大学商学院演讲/李录：2006年哥伦比亚大学商学院演讲.md' 'li-lu/李录：2006年哥伦比亚大学商学院演讲.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2010年哥伦比亚商学院演讲及问答 /李录： 2010年哥伦比亚商学院演讲及问答 .md' 'li-lu/李录：2010年哥伦比亚商学院演讲及问答.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2013年于旧金山大学的精彩演讲及学生问答实录/李录：2013年于旧金山大学的精彩演讲及学生问答实录.md' 'li-lu/李录：2013年于旧金山大学的精彩演讲及学生问答实录.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2013年哥伦比亚商学院杂志采访.md' 'li-lu/李录：2013年哥伦比亚商学院杂志采访.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2018年接受《红周刊》独家采访.md' 'li-lu/李录：2018年接受《红周刊》独家采访.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2019年专业投资人交流.md' 'li-lu/李录：2019年专业投资人交流.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2019年北大演讲-价值投资实践.md' 'li-lu/李录：2019年北大演讲-价值投资实践.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2020年谈危机、创新、个人与世界.md' 'li-lu/李录：2020年谈危机、创新、个人与世界.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2021年和36氪对话.md' 'li-lu/李录：2021年和36氪对话.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2021年对话哥伦比亚教授格林沃德.md' 'li-lu/李录：2021年对话哥伦比亚教授格林沃德.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2021年接受诺亚专访.md' 'li-lu/李录：2021年接受诺亚专访.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2023年怀念我的老师查理·芒格.md' 'li-lu/李录：2023年怀念我的老师查理·芒格.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2024年北大光华管理学院《价值投资》十周年演讲.md' 'li-lu/李录：2024年北大光华管理学院《价值投资》十周年演讲.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/知行合一的人生——李录先生讲座笔记.md' 'li-lu/知行合一的人生——李录先生讲座笔记.md'
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2006年哥伦比亚大学商学院演讲/images/image.png' li-lu/images/2006-columbia-image.png
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2006年哥伦比亚大学商学院演讲/images/1-1.png' li-lu/images/2006-columbia-1-1.png
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2006年哥伦比亚大学商学院演讲/images/1-2.png' li-lu/images/2006-columbia-1-2.png
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2006年哥伦比亚大学商学院演讲/images/1.png' li-lu/images/2006-columbia-1.png
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2006年哥伦比亚大学商学院演讲/images/2.png' li-lu/images/2006-columbia-2.png
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2010年哥伦比亚商学院演讲及问答 /images/image.png' li-lu/images/2010-columbia-image.png
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2013年于旧金山大学的精彩演讲及学生问答实录/images/image.png' li-lu/images/2013-usf-image.png
cp '/Users/ruimin/Desktop/code/invest_paper/投资大师汇总/李录/李录：2013年于旧金山大学的精彩演讲及学生问答实录/images/image-1.png' li-lu/images/2013-usf-image-1.png
```

```text
li-lu/李录：2006年哥伦比亚大学商学院演讲.md
li-lu/李录：2010年哥伦比亚商学院演讲及问答.md
li-lu/李录：2013年于旧金山大学的精彩演讲及学生问答实录.md
li-lu/李录：2013年哥伦比亚商学院杂志采访.md
li-lu/李录：2018年接受《红周刊》独家采访.md
li-lu/李录：2019年专业投资人交流.md
li-lu/李录：2019年北大演讲-价值投资实践.md
li-lu/李录：2020年谈危机、创新、个人与世界.md
li-lu/李录：2021年和36氪对话.md
li-lu/李录：2021年对话哥伦比亚教授格林沃德.md
li-lu/李录：2021年接受诺亚专访.md
li-lu/李录：2023年怀念我的老师查理·芒格.md
li-lu/李录：2024年北大光华管理学院《价值投资》十周年演讲.md
li-lu/知行合一的人生——李录先生讲座笔记.md
```

图片目标名称必须是：

```text
li-lu/images/2006-columbia-image.png
li-lu/images/2006-columbia-1-1.png
li-lu/images/2006-columbia-1-2.png
li-lu/images/2006-columbia-1.png
li-lu/images/2006-columbia-2.png
li-lu/images/2010-columbia-image.png
li-lu/images/2013-usf-image.png
li-lu/images/2013-usf-image-1.png
```

仅在三篇目标 Markdown 中机械替换图片链接：

```text
2006: images/image.png -> images/2006-columbia-image.png
2006: images/1-1.png -> images/2006-columbia-1-1.png
2006: images/1-2.png -> images/2006-columbia-1-2.png
2006: images/1.png -> images/2006-columbia-1.png
2006: images/2.png -> images/2006-columbia-2.png
2010: images/image.png -> images/2010-columbia-image.png
2013 USF: images/image.png -> images/2013-usf-image.png
2013 USF: images/image-1.png -> images/2013-usf-image-1.png
```

- [ ] **Step 4: 创建统一原文类型配置**

创建 `src/lib/source-types.ts`：

```ts
export const SOURCE_DEFINITIONS = [
  {
    directory: "shareholders",
    type: "shareholder",
    label: "股东会与股东信",
    mark: "会",
    description: "历年股东会、股东信与问答记录"
  },
  {
    directory: "speech",
    type: "speech",
    label: "演讲与访谈",
    mark: "访",
    description: "公开演讲、访谈、文章与声明"
  },
  {
    directory: "li-lu",
    type: "li-lu",
    label: "李录演讲和访谈",
    mark: "录",
    description: "李录的演讲、访谈、交流与文章"
  }
] as const;

export type SourceDefinition = (typeof SOURCE_DEFINITIONS)[number];
export type SourceDirectory = SourceDefinition["directory"];
export type SourceType = SourceDefinition["type"];

export const SOURCE_DIRECTORIES = SOURCE_DEFINITIONS.map((source) => source.directory);

export function sourceTypeLabel(source: { type: SourceType }): string {
  return SOURCE_DEFINITIONS.find((definition) => definition.type === source.type)?.label ?? source.type;
}
```

- [ ] **Step 5: 让 corpus loader 遍历统一配置**

在 `src/lib/corpus.ts` 引入配置和类型：

```ts
import {
  SOURCE_DEFINITIONS,
  type SourceDirectory,
  type SourceType
} from "./source-types";
```

将 `OriginalSource.type` 改为：

```ts
type: SourceType;
```

将目录参数改为：

```ts
function readMarkdownFiles(directory: "articles" | SourceDirectory): string[] {
```

将 `loadOriginalSources()` 替换为：

```ts
export function loadOriginalSources(): OriginalSource[] {
  return SOURCE_DEFINITIONS.flatMap(({ directory, type }) =>
    readMarkdownFiles(directory).map((filePath) => {
      const raw = readRepoFile(filePath);
      const parsed = parseMarkdownDocument(filePath, raw);
      const title = titleFromMarkdown(filePath, parsed.body);
      const body = rewriteRelativeImagePaths(parsed.body, filePath);
      return {
        slug: filePathToSlug(filePath),
        filePath,
        title,
        type,
        year: inferYear(filePath, parsed.body),
        excerpt: extractExcerpt(parsed.body),
        body,
        headings: extractHeadings(parsed.body)
      };
    })
  );
}
```

- [ ] **Step 6: 运行语料测试并确认通过**

Run: `npx vitest run tests/corpus.test.ts`

Expected: PASS；新增两项测试通过，现有 corpus 测试无回归。

- [ ] **Step 7: 核对复制完整性**

Run: `find li-lu -maxdepth 1 -type f -name '*.md' | wc -l`

Expected: `14`

Run: `find li-lu/images -maxdepth 1 -type f -name '*.png' | wc -l`

Expected: `8`

Run: `rg -n "!\\[[^]]*\\]\\(images/(?:image(?:-1)?|[12](?:-[12])?)\\.png\\)" li-lu`

Expected: 无输出；不存在旧的冲突图片名引用。

- [ ] **Step 8: 提交语料与 loader**

```bash
git add li-lu src/lib/source-types.ts src/lib/corpus.ts tests/corpus.test.ts
git commit -m "feat: import Li Lu source corpus"
```

---

### Task 2: 接入侧栏、类型标签和原文关系

**Files:**
- Modify: `tests/navigation.test.ts`
- Modify: `tests/relations.test.ts`
- Modify: `tests/seo.test.ts`
- Modify: `src/lib/navigation.ts`
- Modify: `src/lib/relations.ts`
- Modify: `src/lib/seo.ts`

**Interfaces:**
- Consumes: `SOURCE_DEFINITIONS`, `SourceType`, `sourceTypeLabel(source)`。
- Produces: `sameYearSources(source, sources, limit?): OriginalSource[]`。
- Produces: `buildSidebarSections()` 的“原文”组顺序固定为股东会、演讲与访谈、李录演讲和访谈。

- [ ] **Step 1: 写入失败的侧栏测试**

在 `tests/navigation.test.ts` 的 `sources` fixture 加入：

```ts
{
  slug: "李录-2024年北大光华管理学院-价值投资-十周年演讲",
  filePath: "li-lu/李录：2024年北大光华管理学院《价值投资》十周年演讲.md",
  title: "2024年12月7日，著名投资人李录北大演讲全文",
  type: "li-lu",
  year: "2024",
  excerpt: "",
  body: "",
  headings: []
}
```

将分组断言扩展为：

```ts
expect(sections[0].groups.map((group) => [group.label, group.count])).toEqual([
  ["股东会与股东信", 1],
  ["演讲与访谈", 1],
  ["李录演讲和访谈", 1]
]);
```

新增激活测试：

```ts
it("opens the Li Lu group for an active Li Lu source", () => {
  const sections = buildSidebarSections(
    articles,
    sources,
    "/sources/李录-2024年北大光华管理学院-价值投资-十周年演讲/"
  );

  const liLu = sections[0].groups.find((group) => group.label === "李录演讲和访谈")!;
  expect(liLu.open).toBe(true);
  expect(liLu.children[0].active).toBe(true);
});
```

- [ ] **Step 2: 写入失败的同类原文测试**

在 `tests/relations.test.ts` 导入 `sameYearSources`，并新增：

```ts
it("keeps same-year source recommendations within the same source type", () => {
  const liLu = {
    slug: "李录-2017",
    filePath: "li-lu/李录：2017年访谈.md",
    title: "李录：2017年访谈",
    type: "li-lu",
    year: "2017",
    excerpt: "",
    body: "",
    headings: []
  } satisfies OriginalSource;

  expect(sameYearSources(liLu, [...sources, liLu])).toEqual([]);
});
```

- [ ] **Step 3: 写入失败的类型标签和索引测试**

在 `tests/seo.test.ts` 导入 `sourceTypeLabel`，新增：

```ts
it("labels Li Lu sources separately", () => {
  expect(sourceTypeLabel({ type: "li-lu" })).toBe("李录演讲和访谈");
});
```

在 sitemap 测试中加入：

```ts
expect(urls.some((url) => url.includes("/sources/李录-2024年北大光华管理学院-价值投资-十周年演讲/"))).toBe(true);
```

在完整 LLM 索引测试中加入：

```ts
expect(text).toContain("李录演讲和访谈");
expect(text).toContain("著名投资人李录北大演讲全文");
```

- [ ] **Step 4: 运行三个测试文件并确认预期失败**

Run: `npx vitest run tests/navigation.test.ts tests/relations.test.ts tests/seo.test.ts`

Expected: FAIL；第三组不存在、`sameYearSources` 尚未导出、李录类型仍被旧二选一逻辑误标。

- [ ] **Step 5: 让侧栏由统一配置生成三组原文**

在 `src/lib/navigation.ts` 导入：

```ts
import { SOURCE_DEFINITIONS, type SourceType } from "./source-types";
```

删除本地 `sourceLabels`，将 `sourceGroup` 改为：

```ts
const sourceGroup = (type: SourceType): SidebarGroup => {
  const definition = SOURCE_DEFINITIONS.find((source) => source.type === type)!;
  return makeGroup(
    definition.label,
    sources
      .filter((source) => source.type === type)
      .sort((a, b) => a.year.localeCompare(b.year) || a.title.localeCompare(b.title, "zh-Hans-CN"))
      .map((source) => toLeaf(source.title, `/sources/${source.slug}/`, currentPath))
  );
};
```

将原文 section 改为：

```ts
{
  title: "原文",
  groups: SOURCE_DEFINITIONS.map((source) => sourceGroup(source.type))
}
```

- [ ] **Step 6: 实现同类型、同年份相关推荐**

在 `src/lib/relations.ts` 新增：

```ts
export function sameYearSources(
  source: OriginalSource,
  sources: OriginalSource[],
  limit = 8
): OriginalSource[] {
  return sources
    .filter(
      (candidate) =>
        candidate.slug !== source.slug &&
        candidate.type === source.type &&
        candidate.year === source.year
    )
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"))
    .slice(0, limit);
}
```

- [ ] **Step 7: 让 SEO 复用统一类型标签**

在 `src/lib/seo.ts` 删除旧 `sourceTypeLabel()`，改为：

```ts
import { sourceTypeLabel } from "./source-types";
export { sourceTypeLabel };
```

保留 `buildLlmsFullTxt()` 对 `sourceTypeLabel(source)` 的现有调用。

- [ ] **Step 8: 运行三个测试文件并确认通过**

Run: `npx vitest run tests/navigation.test.ts tests/relations.test.ts tests/seo.test.ts`

Expected: PASS；第三组、激活状态、同类型推荐、类型标签与两个索引断言全部通过。

- [ ] **Step 9: 提交导航和关系层**

```bash
git add src/lib/navigation.ts src/lib/relations.ts src/lib/seo.ts tests/navigation.test.ts tests/relations.test.ts tests/seo.test.ts
git commit -m "feat: wire Li Lu source navigation"
```

---

### Task 3: 接入首页、原文索引、单篇页和图片路由

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/sources/index.astro`
- Modify: `src/pages/sources/[slug].astro`
- Modify: `src/pages/[sourceDirectory]/images/[image].png.ts`

**Interfaces:**
- Consumes: `SOURCE_DEFINITIONS`, `SOURCE_DIRECTORIES`, `sourceTypeLabel(source)`, `sameYearSources(source, sources)`。
- Produces: 首页三张原文卡、`/sources/#li-lu` 分区、14 个李录阅读页和 8 个 `/li-lu/images/*.png` 静态资源。

- [ ] **Step 1: 运行页面接入验收并确认当前失败**

Run: `npm run build`

Expected: exit 0；`loadOriginalSources()` 已能生成 14 个李录阅读页。

Run: `rg -n 'href="/sources/#li-lu"' dist/index.html`

Expected: FAIL，无匹配；首页尚未接入第三张原文卡。

Run: `rg -n 'id="li-lu"' dist/sources/index.html`

Expected: FAIL，无匹配；原文索引尚未接入第三个内容分区。

Run: `test "$(find dist/li-lu/images -maxdepth 1 -type f -name '*.png' 2>/dev/null | wc -l | tr -d ' ')" = "8"`

Expected: FAIL；图片路由尚未允许 `li-lu`。

- [ ] **Step 2: 让首页从统一配置生成原文卡**

在 `src/pages/index.astro` 导入：

```ts
import { SOURCE_DEFINITIONS } from "../lib/source-types";
```

将 `originalCards` 替换为：

```ts
const originalCards = SOURCE_DEFINITIONS.map((definition) => ({
  mark: definition.mark,
  title: definition.label,
  description: definition.description,
  href: `/sources/#${definition.type}`,
  count: sources.filter((source) => source.type === definition.type).length
}));
```

将原文区说明改为：

```astro
<p class="section-copy">先原文，后观点；先证据，后文章。阅读芒格与李录的公开表达。</p>
```

- [ ] **Step 3: 让原文索引从统一配置生成分区**

在 `src/pages/sources/index.astro` 导入：

```ts
import { SOURCE_DEFINITIONS } from "../../lib/source-types";
```

将 `sourceGroups` 替换为：

```ts
const sourceGroups = SOURCE_DEFINITIONS.map((definition) => ({
  id: definition.type,
  title: definition.label,
  sources: sources.filter((source) => source.type === definition.type)
}));
const description = "查理·芒格与李录的股东会、股东信、演讲、访谈、交流与文章资料索引。";
```

结构化数据和 `BaseLayout` 共用 `description`，页面标题改为：

```astro
<h1 class="hero-title">股东会、演讲、访谈、交流与文章。</h1>
```

- [ ] **Step 4: 单篇页显示统一标签并限制同类推荐**

在 `src/pages/sources/[slug].astro` 将关系层导入改为：

```ts
import { buildSourceArticleMap, sameYearSources } from "../../lib/relations";
```

将同类来源计算替换为：

```ts
const allSources = loadOriginalSources();
const sourceArticleMap = buildSourceArticleMap(articles, allSources);
const citedBy = sourceArticleMap.get(source.slug) ?? [];
const sameYear = sameYearSources(source, allSources);
```

将页头类型文本替换为：

```astro
<p>{sourceLabel}</p>
```

- [ ] **Step 5: 图片路由接受第三个白名单目录**

在 `src/pages/[sourceDirectory]/images/[image].png.ts` 导入并替换目录常量：

```ts
import { SOURCE_DIRECTORIES, type SourceDirectory } from "../../../lib/source-types";

const IMAGE_DIRECTORIES = SOURCE_DIRECTORIES;
```

白名单判断保持为：

```ts
!IMAGE_DIRECTORIES.includes(sourceDirectory as SourceDirectory)
```

- [ ] **Step 6: 运行 Astro 类型检查**

Run: `npx astro check`

Expected: `0 errors`；三种 `SourceType` 在所有页面中类型一致。

- [ ] **Step 7: 运行静态构建**

Run: `npm run build`

Expected: exit 0；构建日志生成李录 `/sources/<slug>/` 页面和 `li-lu/images/*.png` 路由。

- [ ] **Step 8: 核对构建产物**

Run: `find dist/sources -mindepth 2 -maxdepth 2 -name index.html -path '*李录*' | wc -l`

Expected: `14`

Run: `find dist/li-lu/images -maxdepth 1 -type f -name '*.png' | wc -l`

Expected: `8`

Run: `rg -n 'href="/sources/#li-lu"' dist/index.html`

Expected: 首页存在李录原文入口。

Run: `rg -n 'id="li-lu"' dist/sources/index.html`

Expected: 原文索引存在李录内容分区，且同一行包含“李录演讲和访谈”和“14 篇”。

Run: `rg -n "/li-lu/images/2006-columbia-image.png" dist/sources/李录-2006年哥伦比亚大学商学院演讲/index.html`

Expected: 找到李录 2006 年演讲页面中的图片绝对路径。

- [ ] **Step 9: 提交页面接入**

```bash
git add src/pages/index.astro src/pages/sources/index.astro 'src/pages/sources/[slug].astro' 'src/pages/[sourceDirectory]/images/[image].png.ts'
git commit -m "feat: expose Li Lu source pages"
```

---

### Task 4: 完整门禁与需求验收

**Files:**
- Verify only; no production files expected.

**Interfaces:**
- Consumes: Tasks 1–3 的全部实现。
- Produces: 可复现的完成证据。

- [ ] **Step 1: 检查工作树范围**

Run: `git status --short`

Expected: 仅保留用户原有未跟踪 `AGENTS.md`；没有遗漏的实现文件。

- [ ] **Step 2: 运行差异格式检查**

Run: `git diff --check HEAD~3..HEAD`

Expected: 无输出，exit 0。

- [ ] **Step 3: 运行仓库完整门禁**

Run: `npm run check`

Expected: `validate:content`、`astro check`、全部 Vitest 测试和 `astro build` 均 exit 0。

- [ ] **Step 4: 最终逐项核对规格**

确认：

```text
[x] 左侧原文第三组名称为“李录演讲和访谈”
[x] 分组计数为 14
[x] 14 篇均生成单篇页面
[x] 8 张图片均进入构建产物
[x] 首页和 /sources/ 均出现第三入口
[x] sitemap 和 llms-full 收录李录资料
[x] 同类原文不跨 source.type
[x] 外部绝对路径不出现在运行时代码
[x] AGENTS.md 未被修改或提交
```
