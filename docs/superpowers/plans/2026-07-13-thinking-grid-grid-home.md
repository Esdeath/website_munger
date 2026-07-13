# 思维格栅网格首页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将思维格栅首页渲染为由 12 个可点击模型模块组成的响应式网格。

**Architecture:** `src/lib/thinking-grid.ts` 从独立快照的索引 Markdown 派生 12 个层级对象，并复用现有 slug、链接与模型记录。首页 Astro 模板仅消费这些对象；CSS 负责两列模块卡片和卡片内自适应模型格子，不增加客户端脚本。

**Tech Stack:** Astro 4、TypeScript、Vitest、全局 CSS、现有 Markdown 快照加载器。

## Global Constraints

- 只读取项目根目录的 `thinking-grids/` 独立快照，不读取或同步外部项目。
- 首页只显示标题与 12 个模块，不显示原始导语、支持文档链接或“使用顺序”。
- 模型详情页、左侧导航和全站主题不变。
- 分类必须来自 `thinking-grids/思维格栅.md`，不能在页面模板或独立配置中硬编码。
- 每个模型格子链接到既有 `/thinking-grids/<slug>/` 静态页面。

---

### Task 1: 解析并验证十二层模块数据

**Files:**
- Modify: `tests/thinking-grid.test.ts`
- Modify: `src/lib/thinking-grid.ts`

**Interfaces:**
- Consumes: `ThinkingGridDocument`, `ThinkingGridSnapshot`, `thinkingGridHref(slug)`。
- Produces: `ThinkingGridLayer`、`ThinkingGridSnapshot.layers`，供首页模板直接渲染。

- [ ] **Step 1: 写出失败的层级解析测试**

  在 `tests/thinking-grid.test.ts` 的现有 `describe` 内添加：

  ```ts
  it("derives twelve ordered layers with every copied model linked once", () => {
    const snapshot = loadThinkingGridSnapshot();

    expect(snapshot.layers).toHaveLength(12);
    expect(snapshot.layers[0]).toMatchObject({
      number: 1,
      title: "思维操作系统",
      question: "我该如何思考？",
      purpose: "判断、学习、解释与纠错。",
      models: expect.arrayContaining([
        expect.objectContaining({ title: "二阶效应", href: "/thinking-grids/二阶效应/" })
      ])
    });
    expect(snapshot.layers[11]).toMatchObject({
      number: 12,
      title: "制度、历史与价值判断"
    });
    expect(snapshot.layers.flatMap((layer) => layer.models)).toHaveLength(178);
    expect(new Set(snapshot.layers.flatMap((layer) => layer.models.map((model) => model.slug))).size).toBe(178);
  });
  ```

- [ ] **Step 2: 运行测试，确认它因 `layers` 缺失而失败**

  Run: `npm test -- tests/thinking-grid.test.ts`

  Expected: FAIL，包含 `snapshot.layers` 为 `undefined` 或无法读取其长度；现有快照测试仍可执行。

- [ ] **Step 3: 在加载器中实现最小的索引解析**

  在 `src/lib/thinking-grid.ts` 添加以下公开类型和解析辅助函数：

  ```ts
  export interface ThinkingGridLayerModel {
    slug: string;
    title: string;
    href: string;
  }

  export interface ThinkingGridLayer {
    number: number;
    title: string;
    question: string;
    purpose: string;
    models: ThinkingGridLayerModel[];
  }
  ```

  将 `ThinkingGridSnapshot` 扩展为 `layers: ThinkingGridLayer[]`。从 `## 思维操作系统` 至最后一个二级标题之间逐段切分索引正文；每段用 `先问：` 和 `用途：` 提取文案，用已有 `markdownLinks` 取得 `.md` 链接。对每个链接通过 `filePathToSlug(path.posix.basename(url))` 查找已加载的模型，组装 `{ slug, title: linkText, href: thinkingGridHref(slug) }`。仅接受 `index.body` 中层级表后的 12 个二级标题，并在下列任一情况抛出错误：数量不是 12、任一层没有模型、找不到模型、模型 slug 重复、合计模型数不等于 `models.length`。

  在 `loadThinkingGridSnapshot` 中构造 `models` 后调用解析器，并返回：

  ```ts
  const layers = parseThinkingGridLayers(index.body, models);
  return { index, models, layers };
  ```

- [ ] **Step 4: 运行层级测试，确认通过**

  Run: `npm test -- tests/thinking-grid.test.ts`

  Expected: PASS，所有现有快照、链接和新增层级断言通过。

- [ ] **Step 5: 提交解析器与测试**

  ```bash
  git add src/lib/thinking-grid.ts tests/thinking-grid.test.ts
  git commit -m "feat: derive thinking grid layers"
  ```

### Task 2: 渲染模块卡片与模型格子

**Files:**
- Modify: `src/pages/thinking-grids/index.astro`
- Modify: `src/styles/global.css`
- Test: `tests/thinking-grid.test.ts`

**Interfaces:**
- Consumes: `loadThinkingGridSnapshot().layers`，每层的 `number`、`title`、`question`、`purpose`、`models`。
- Produces: `/thinking-grids/` 的静态模块卡片 HTML；模型链接保持 `ThinkingGridLayerModel.href`。

- [ ] **Step 1: 添加首页网格模板契约测试**

  在 `tests/thinking-grid.test.ts` 添加：

  ```ts
  it("renders the homepage from layers instead of the raw index markdown", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/pages/thinking-grids/index.astro"),
      "utf8"
    );

    expect(page).toContain('class="thinking-grid-layers"');
    expect(page).toContain("snapshot.layers.map");
    expect(page).not.toContain("renderMarkdownToHtml");
  });
  ```

- [ ] **Step 2: 运行测试，确认它因旧 Markdown 首页而失败**

  Run: `npm test -- tests/thinking-grid.test.ts`

  Expected: FAIL，断言找不到 `thinking-grid-layers`，且仍能观察到 `renderMarkdownToHtml`；这证明旧首页尚未满足网格模板契约。

- [ ] **Step 3: 用层级数据替换首页 Markdown 渲染**

  在 `src/pages/thinking-grids/index.astro` 删除 `renderMarkdownToHtml` 与 `resolveThinkingGridMarkdownLink` 的导入、`rendered` 计算值。保留 `loadThinkingGridSnapshot`、JSON-LD 和 `BaseLayout`，并将页面主体替换为：

  ```astro
  <section class="page thinking-grid-page">
    <header class="thinking-grid-heading">
      <p class="eyebrow">12 层思维模型</p>
      <h1>{snapshot.index.title}</h1>
    </header>

    <div class="thinking-grid-layers" aria-label="思维格栅十二层导航">
      {snapshot.layers.map((layer) => (
        <section class="thinking-grid-layer" aria-labelledby={`thinking-grid-layer-${layer.number}`}>
          <header class="thinking-grid-layer-heading">
            <p class="thinking-grid-layer-number">{String(layer.number).padStart(2, "0")}</p>
            <div>
              <p class="thinking-grid-layer-count">{layer.models.length} 个模型</p>
              <h2 id={`thinking-grid-layer-${layer.number}`}>{layer.title}</h2>
            </div>
          </header>
          <p class="thinking-grid-question">{layer.question}</p>
          <p class="thinking-grid-purpose">{layer.purpose}</p>
          <ul class="thinking-grid-models">
            {layer.models.map((model) => (
              <li><a href={model.href}>{model.title}</a></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </section>
  ```

- [ ] **Step 4: 添加响应式网格样式**

  在 `src/styles/global.css` 的通用页面样式后增加：

  ```css
  .thinking-grid-heading { margin-bottom: 34px; }
  .thinking-grid-heading h1 { margin: 0; color: var(--ink-strong); font-size: clamp(2rem, 4vw, 3.2rem); }
  .thinking-grid-layers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .thinking-grid-layer { padding: 24px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); }
  .thinking-grid-layer-heading { display: flex; gap: 14px; align-items: start; }
  .thinking-grid-layer-number { margin: 0; color: var(--green); font: 800 1rem/1 ui-sans-serif, system-ui, sans-serif; }
  .thinking-grid-layer-count, .thinking-grid-purpose { color: var(--muted); font-size: var(--fs-meta); }
  .thinking-grid-layer h2, .thinking-grid-question, .thinking-grid-purpose { margin: 0; }
  .thinking-grid-question { margin-top: 16px; color: var(--ink-strong); font-weight: 800; }
  .thinking-grid-purpose { margin-top: 6px; }
  .thinking-grid-models { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 20px 0 0; list-style: none; }
  .thinking-grid-models a { display: block; padding: 7px 10px; color: var(--green-dark); background: var(--green-soft); border: 1px solid var(--line); border-radius: 6px; font-size: var(--fs-small); font-weight: 800; line-height: 1.35; }
  .thinking-grid-models a:hover, .thinking-grid-models a:focus-visible { background: var(--paper); border-color: var(--green); }
  @media (max-width: 760px) { .thinking-grid-layers { grid-template-columns: 1fr; gap: 14px; } .thinking-grid-layer { padding: 20px; } }
  ```

- [ ] **Step 5: 运行针对性测试和静态检查**

  Run: `npm test -- tests/thinking-grid.test.ts && npx astro check`

  Expected: PASS，类型检查无错误或警告。

- [ ] **Step 6: 构建并检查输出契约**

  Run: `npm run build && test "$(rg -o 'class=\"thinking-grid-layer\"' dist/thinking-grids/index.html | wc -l | tr -d ' ')" = "12" && test "$(rg -o 'href=\"/thinking-grids/[^\"]+/\"' dist/thinking-grids/index.html | wc -l | tr -d ' ')" = "178" && ! rg -q '这里收录 178 篇正式思维模型文章|使用顺序' dist/thinking-grids/index.html`

  Expected: exit code 0；恰好 12 张模块卡片、178 个模型链接，且不输出被排除的索引段落。

- [ ] **Step 7: 提交首页与样式**

  ```bash
  git add src/pages/thinking-grids/index.astro src/styles/global.css tests/thinking-grid.test.ts
  git commit -m "feat: render thinking grid homepage"
  ```

### Task 3: 全量回归验证

**Files:**
- Verify only: `src/lib/thinking-grid.ts`, `src/pages/thinking-grids/index.astro`, `src/styles/global.css`, `tests/thinking-grid.test.ts`

**Interfaces:**
- Consumes: 已完成的层级解析和首页模板。
- Produces: 通过内容校验、类型检查、单元测试与静态构建的站点。

- [ ] **Step 1: 检查仅本功能文件的差异空白错误**

  Run: `git diff --check -- src/lib/thinking-grid.ts src/pages/thinking-grids/index.astro src/styles/global.css tests/thinking-grid.test.ts`

  Expected: 无输出。

- [ ] **Step 2: 执行项目完整检查**

  Run: `npm run check`

  Expected: 内容校验、`astro check`、Vitest 和 Astro build 全部 exit code 0。

- [ ] **Step 3: 最终检查构建产物与工作区**

  Run: `test "$(rg -o 'class=\"thinking-grid-layer\"' dist/thinking-grids/index.html | wc -l | tr -d ' ')" = "12" && test "$(rg -o 'href=\"/thinking-grids/[^\"]+/\"' dist/thinking-grids/index.html | wc -l | tr -d ' ')" = "178" && git status --short`

  Expected: 前两个断言成功；只报告实施所产生的待提交文件，且不触碰用户既有的 `.workbuddy/`。

- [ ] **Step 4: 汇报验证证据与提交范围**

  报告 `npm run check` 的成功输出、12 个模块/178 个链接的构建产物断言，以及本功能提交的哈希。
