# 「不可为清单 / Stop Doing List」专题页 — 会话全程纪要

> 日期：2026-06-30 ～ 2026-07-01
> 范围：从一句话需求到上线一个新站点专题页的完整过程，含用户提问、执行步骤、产出结果、成本复盘。
> 相关产出：spec `docs/superpowers/specs/2026-06-30-stop-doing-list-design.md`；plan `docs/superpowers/plans/2026-06-30-stop-doing-list.md`；已合并到 `main`（merge commit `6a8afee`）。

---

## 一、用户在本轮对话中提出的所有问题 / 指令

按时间顺序：

1. **初始需求**（通过 `/superpowers:writing-plans` 触发）：「从原文中获取芒格认为不该做的、错误的、需要警惕的、Stop doing list 等不可为的事情。」
2. 一系列澄清问题的回答（见第二节的提问清单），逐项确认了交付形态、内容来源、分组、条目组成、导航、覆盖范围。
3. 「继续」「ok」「好的」「继续、」等 —— 推进设计与计划各阶段。
4. 选择执行方式：「1」（Subagent-Driven，逐任务派子代理 + 两段式审查）。
5. 分支策略：「新建 feature 分支」。
6. 「继续」 —— 在子代理审查因计费报错中断后，要求继续（随后自动恢复）。
7. 「合并到主分支」 —— 选择把完成的分支合并回 `main`。
8. **「为什么这轮对话耗费了这么多 token？有哪些 token 本来是可以省略的？」** —— 成本复盘。
9. 「好的，写进经验中。」 —— 要求把成本教训写入 memory。
10. **「如果我在其他项目中也会遇到同样的问题吗？我该怎么提问才可以避免这样的问题？」** —— 跨项目的可迁移性与提问策略。
11. **本指令**：把全程总结成一份 MD 存到 `docs/`。

---

## 二、我（Claude）的工作步骤

遵循 superpowers 技能链：**brainstorming → writing-plans → subagent-driven-development → finishing-a-development-branch**。

### 阶段 0：技能选择
- 用户用 `/writing-plans` 触发，但只有一句话需求、属创造性工作 —— 按技能流程**先做 brainstorming** 把需求变成 spec，再写 plan。

### 阶段 1：Brainstorming（需求 → 设计）
- 探索项目上下文：70 篇关键词长文（8 主题、固定 8 段模板，每篇已含「四、反过来想」逆向小节）；原语料在 `shareholders/`（34）+ `speech/`（49）；已有 `避免愚蠢` 长文与 `查理芒格：问题清单.md`；`tools/check_article.py` 提供逐字校验。
- 通过 6 个澄清问题逐一定型（每次只问一个）：
  | 维度 | 用户的选择 |
  |---|---|
  | 交付形态 | 新建站点专题页面 |
  | 内容来源 | 从原语料**新抽取**，逐字校验 |
  | 分组方式 | 复用现有 8 个 TOPICS |
  | 条目组成 | 编者提纲 + 逐字引语 + 出处链接 |
  | 导航/网址 | 顶级导航独立页，英文 slug `/stop-doing/` |
  | 覆盖范围 | **穷尽式全量抽取** |
- 读 `corpus.ts` / `navigation.ts` / `slug.ts` / `seo.ts` / `BaseLayout.astro` / `check_article.py` 摸清数据流与校验机制。
- 写 spec → 自审（占位符 / 一致性 / 范围 / 歧义）→ 修一处（`validate:content` 接 Python 校验的具体机制）→ 提交（`97bfd28`）→ 请用户审阅。

### 阶段 2：Writing-plans（设计 → 实现计划）
- 进一步读 `check_article.py` 的 `parse_quote_blocks`/`normalize`、各测试文件、`seo.ts` 函数签名、`package.json` 脚本，确保计划零猜测。
- 产出 10 个任务的逐步计划（TDD + 频繁提交），自审修正一处（多主题排序测试断言）→ 提交（`f21f36e`）。

### 阶段 3：Subagent-Driven 执行（逐任务 + 两段式审查）
- 确认分支策略 → 建 `feat/stop-doing-list`；建 10 项任务追踪表。
- 每个任务：派**实现子代理** → **规格合规审查子代理** → **代码质量审查子代理** → 有问题派回同一实现代理修复 → 标记完成。
- 关键修复（审查抓出的真实问题）：
  - **Task 1** 解析器：破折号切分用 `lastIndexOf`、跨行引语用空串拼接、`###` 早于 `##` 时报错。
  - **Task 3** Python 校验器：`load_topic_titles` 正则限定在 TOPICS 块内、按有无 `——《》` 出处跳过前言、篇名匹配加最短长度保护、错别字「杜撞→杜撰」。
  - **Task 4/6** 侧边栏 `.sidebar-toplink.is-active` 之前不可见 → Task 6 补样式并加 `border-left: 3px solid transparent` 让绿色高亮真正显示。
  - **Task 8**（一行 `package.json` 改动）**内联完成并内联验证**，不派子代理。
- **Task 9 全量抽取**（最大一步）：
  - 把 83 个语料文件切成 6 片，派 6 个 reader 子代理**并行**抽取芒格本人的「不可为」逐字原话 + 主题分类 + 出处，明确排除采访者/巴菲特/听众。
  - 整合子代理：合并去重、按 TOPICS 排序、写 `stop-doing/不可为清单.md`，循环跑 `check_stop_doing.py` 把 ASCII 标点等问题修到 PASS（修了 6 条，0 删除，初版 185 条）。
  - 派 3 个**独立 fact-checker** 并行核查说话人 / 语义 / 年份 —— 抓出 **2 条逐字正确但芒格在引用别人的话**（费曼、凯恩斯），予以删除。
  - 终态 **183 条**，`check_stop_doing.py` PASS；清理临时目录；提交（`9df901d`）。
- **Task 10 验收**：`npm run check` 退出 0（70 篇文章校验 + 不可为清单 PASS + astro check 0 错误 + vitest 59/59 + build 166 页）；构建产物抽查（页面、sitemap、llms.txt 均含 `/stop-doing/`，183 条全部渲染）。
- **最终整体审查**：审了全分支 diff，抓出并修复一处一致性缺陷 —— Python 校验器用 `index('——')`（首个），TS 解析器用 `lastIndexOf`（末个），导致含中文破折号的引语其后半段未被校验；改为 `rfind` 并用「破折号后篡改」反向测试证明现在能拦截（`f0d12d8`）。

### 阶段 4：Finishing-a-development-branch
- 验证测试通过 → 检测环境（普通仓库，base = `main`）→ 给出 4 个标准选项 → 用户选「合并到主分支」。
- `git checkout main` → `--no-ff` 合并 → 在合并结果上**再跑一次 `npm run check`（退出 0）** → 删除已合并分支 → 工作区干净。

---

## 三、最终产出

**新页面 `/stop-doing/`「不可为清单」**，已合并到 `main`（merge commit `6a8afee`，分支共 13 个提交）。

- **183 条芒格逐字「不可为」原话**，按 7 个主题分组（投资原则 / 思维方法 / 人性偏误 / 品格处世 / 公司案例 / 学科体系 / 宏观警示；「常引用人物」无合适条目，按设计留空不显示），每条 = 编者提纲 +「逐字引语」+ 可点击的原文出处链接。
- 侧边栏顶级入口、`sitemap.xml`、`llms.txt` 均已收录。

**代码与资产**

| 文件 | 职责 |
|---|---|
| `stop-doing/不可为清单.md` | 内容数据（仓库根目录纯文件，构建时读取） |
| `src/lib/stop-doing.ts` | 纯解析器 `parseStopDoingList` + `loadStopDoingList`（13 个单测） |
| `src/pages/stop-doing.astro` | 页面（archive 外壳） |
| `tools/check_stop_doing.py` | 逐字校验脚本，接入 `npm run validate:content` |
| `src/lib/navigation.ts` + `src/layouts/BaseLayout.astro` | 侧边栏顶级入口 |
| `src/lib/seo.ts` | sitemap + llms.txt 收录 |
| `src/styles/global.css` | 页面样式 |
| `tests/stop-doing.test.ts`（+ navigation/seo 测试补充） | 单元测试 |

**质量保证**

- 每个任务都走「实现 → 规格审查 → 代码质量审查」两段式 review。
- **逐字校验**（`check_stop_doing.py`）保证每条引语字节级存在于语料。
- **独立 fact-check** 抓出校验脚本抓不到的归属错误（费曼、凯恩斯两条，已删）。
- 合并后的 `main` 上 `npm run check` 全绿。

**文档**

- 设计 spec：`docs/superpowers/specs/2026-06-30-stop-doing-list-design.md`
- 实现计划：`docs/superpowers/plans/2026-06-30-stop-doing-list.md`
- 本纪要：`docs/stop-doing-list-session-summary.md`

---

## 四、成本复盘（用户问「为什么这么贵 / 怎么避免」）

**最大浪费**：同一批语料被**读了三遍** —— reader 抽取一遍、整合代理 grep 修标点一遍、fact-checker 完整回读一遍；外加把 6 份 reader JSON（约 190 条）手工 `Write` 进临时文件（已在上下文里的内容又复制了一份）。

**可省项**：① reader 一次性带回「引语 + 上下文 + 说话人」，fact-check 只抽查访谈类高风险来源；② 不把代理输出转写回磁盘；③ 琐碎改动内联做（如 Task 8）；④ build 只在实现阶段跑一次，审查读结果；⑤ 合并相邻细任务。估计可省 30–40% 且不损质量。

**不该省的**：独立 fact-check、逐字/精确性要求、测试与质量门槛 —— 这次正是 fact-check 兜住了正确性。

**跨项目结论**：该浪费会在任何「多个 agent 反复扫同一批源 + 穷尽式覆盖 + 逐字要求」的任务上重现（代码库审计、文档汇总、补测试、迁移调用点等）；单点任务基本不会。最有效的提问是：**「这个任务哪部分最贵？哪些是必要开销、哪些是可优化的重复劳动？先估算、定范围，再动手。」** 并可在开工前把「穷尽式」改成「先打样一批再决定全量」。

**已沉淀为经验**：memory `verbatim-extraction-token-cost.md`（已在 `MEMORY.md` 索引），并链接到既有 `munger-essay-workflow.md` 中同类的 token 优化杠杆。
