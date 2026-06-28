# 二级折叠侧栏 + 右侧直接显示文章

日期：2026-06-28

## 目标

把侧栏的两个区块（原文、解读）改造成可展开的二级列表：

- 一级 = 分类（原文下的「股东会与股东信」「演讲与访谈」；解读下的每个专题分类）
- 二级 = 该分类下的每一篇文档
- 点击二级条目，在右侧主阅读区直接显示该篇（源/文章页已是此布局）

参考图为巴菲特致股东信的 mock，仅用于说明交互形态；本站沿用真实数据与标签
（原文：股东会与股东信 34 篇、演讲与访谈 49 篇；解读：70 篇）。

## 范围内的决定

- 原文、解读两个区块都改成二级折叠列表。
- 首页保持现有「芒格总纲」落地页（无激活分支 → 初始全部折叠）。
- 阅读页保留右栏（原文信息／关键词／同类原文）。
- 一级分类行仅作展开/折叠，不再链接到 `/sources/#anchor` 归档网格；不额外加「查看全部」链接。归档索引页 `/sources/`、`/articles/` 仍可从首页卡片到达。

## 架构

### 1. 导航数据 `src/lib/navigation.ts`

`buildSidebarSections` 改为返回树状结构：

```ts
SidebarSection { title: string; groups: SidebarGroup[] }
SidebarGroup   { label: string; count: number; open: boolean; children: SidebarLeaf[] }
SidebarLeaf    { label: string; href: string; active: boolean }
```

- **原文** → 2 个 group：
  - 股东会与股东信 → 全部 `shareholder` 源，按 `year` 再 `title`（zh）排序 → `/sources/<slug>/`
  - 演讲与访谈 → 全部 `speech` 源，同样排序
- **解读** → 每个 category 一个 group（按 zh 排序），children = 该分类文章，按 `quoteCount` 倒序（与 `articles/index.astro` 一致）→ `/articles/<slug>/`
- leaf `label`：源用 `source.title`，文章用 `article.title`。
- 新签名：`buildSidebarSections(articles, sources, currentPath)`
  - `active = normalize(currentPath) === normalize(leaf.href)`（统一尾斜杠后比较）
  - `open = children.some(c => c.active)`

`buildArchiveCards`、`categoryHref` 保留（首页与文章页仍用）。

### 2. 布局 `src/layouts/BaseLayout.astro`

- 用 `Astro.url.pathname` 计算 `currentPath`，取代逐页透传的 `activeHref` prop。
- 每个 group 渲染为原生 `<details open={group.open}>`：
  - `<summary>`：chevron + 分类名 + 计数；仅折叠，不导航
  - 嵌套 `<ul>`：每个 leaf 一个 `<a>` 链接
- 纯 HTML/CSS，无 JS；每次导航由服务端把激活分支渲染为 open。
- 清理：移除已无用的 `activeHref` prop 及其在 `sources/[slug].astro`、`articles/[slug].astro` 的传入，并删除随之失效的 `categoryHref` 导入。

### 3. 样式 `src/styles/global.css`

- `<summary>` 套用现有 `.sidebar-section a` 行的观感（绿色加粗标签、灰色计数），移除默认 disclosure 三角，`open` 时把 `›` chevron 旋转 90°。
- 二级缩进、字重略轻、字号略小；激活 leaf 用 `--green-soft` 背景 + 绿色左边框（沿用现有 `is-active` 样式）。
- 复用现有 design token，不引入新颜色。

## 数据流

页面路由 → BaseLayout 读取 `Astro.url.pathname` → `buildSidebarSections` 计算 active/open →
`<details>` 服务端渲染激活分支为展开、其余折叠 → 用户点二级链接 → 整页导航到对应源/文章页 →
该页激活分支重新展开。

## 测试

- `src/lib/navigation.ts` 的 `buildSidebarSections`：纯函数，单测覆盖
  - 原文/解读分组与计数正确
  - 给定 `currentPath` 时正确标记 active leaf 并 open 其父 group
  - 尾斜杠归一化（`/sources/x` 与 `/sources/x/` 视为同一）
- `npm run build` 通过，`npm test`（vitest）通过。

## 风险 / 取舍

- 一级仅折叠不导航：侧栏不再直达 `/sources/`、`/articles/` 概览网格 —— 已接受。
- 侧栏条目变多（153 篇），但默认只展开激活分支，其余折叠，配合现有 `overflow:auto`，初始视图仍紧凑。
