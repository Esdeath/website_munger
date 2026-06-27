# 从语料到文章的方法论

这份文档只解释方法论:为什么要这样从 `shareholders/` 和 `speech/` 生成 `articles/`。具体执行步骤见 [`generate-articles-best-practices.md`](generate-articles-best-practices.md)。

## 核心目标

把固定语料库变成一组主题文章,同时满足三个条件:

1. **可追溯**:每条引用都能回到原始 Markdown 文件。
2. **可验证**:文章必须通过 `tools/check_article.py`。
3. **可维护**:选题状态、文章模板、成品索引各有独立文件,互不混杂。

## 为什么不能直接写

这个项目的风险不是“写不出来”,而是:

- 引用看起来像原话,实际不是逐字原文。
- 同一个主题反复使用旧文章里的材料,造成重复。
- 低覆盖关键词硬写,最后凑不够 12 处引用和 4 个来源。
- 文章通过脚本,但出处年份、说话人或语义使用不对。

所以流程必须先立校验合同,再选题,再写作。

## 标准流水线

1. **语料固定**:来源只取 `shareholders/` 和 `speech/`。
2. **选题入池**:候选关键词记录在 [`../state/article-backlog.md`](../state/article-backlog.md)。
3. **可行性预检**:用关键词和同义词搜索,确认来源数量足够。
4. **窄读采样**:只读命中行附近上下文,跨年代和场合取样。
5. **套模板成文**:使用 [`../reference/article-template.md`](../reference/article-template.md)。
6. **机器校验**:用 `tools/check_article.py` 验证逐字引用、引用数、来源数和结构。
7. **人工核查**:补足脚本查不到的出处、说话人、语义和数字事实。
8. **同步状态**:更新 [`../state/article-backlog.md`](../state/article-backlog.md) 和 [`../reference/article-index.md`](../reference/article-index.md)。

## 文件边界

| 文件 | 只负责什么 |
|---|---|
| `docs/workflows/generate-articles-best-practices.md` | 以后照着执行的步骤 |
| `docs/workflows/corpus-to-articles-pipeline.md` | 方法论和边界 |
| `docs/state/article-backlog.md` | 选题池、完成状态、选词注意事项 |
| `docs/reference/article-template.md` | 单篇文章结构 |
| `docs/reference/article-index.md` | 成品文章索引 |
| `tools/check_article.py` | 机器校验合同 |

## 校验合同

合格文章至少满足:

- 每条引用逐字存在于语料中。
- 引用数达到门槛。
- 来源数量达到门槛。
- frontmatter 完整,且 `quote_count` 等于实际引用数。
- 必备小节齐全。
- 每条 blockquote 都有出处行。

脚本负责这些硬规则。脚本不负责判断文章是否解释充分,也不能判断引文是否被过度引申。

## 人工核查边界

人工核查只补脚本查不到的事:

- 引文出处年份是否正确。
- 引文说话人是否真是芒格。
- 文章有没有用一条引文证明它没说的结论。
- 数字、价格、年龄和日期是否来自语料。
- 副标题和关键比喻是否有原文依据。

## 复用到新项目

换一套资料时,只替换这些部件:

| 部件 | 本项目 | 新项目替换为 |
|---|---|---|
| 语料库 | `shareholders/` + `speech/` | 新语料目录 |
| 校验器 | `tools/check_article.py` | 新项目校验脚本 |
| 模板 | `docs/reference/article-template.md` | 新文章模板 |
| 选题池 | `docs/state/article-backlog.md` | 新选题池 |
| 成品目录 | `articles/` | 新成品目录 |

不变的是顺序:固定语料 → 建选题池 → 建校验合同 → 写模板 → 试产一篇 → 批量生成 → 同步状态。
