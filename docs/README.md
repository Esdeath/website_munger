# docs/ 文档导航

本目录只记录一件事:如何从 `shareholders/` 和 `speech/` 的原始 Markdown 语料,生成 `articles/` 里的芒格关键词文章,并持续维护这套文章库。

## 先读哪份

1. **以后要照着做一批文章**:读 [`workflows/generate-articles-best-practices.md`](workflows/generate-articles-best-practices.md)。
2. **想理解整套方法论**:读 [`workflows/corpus-to-articles-pipeline.md`](workflows/corpus-to-articles-pipeline.md)。
3. **要选下一篇题目**:读 [`state/article-backlog.md`](state/article-backlog.md)。
4. **要复制文章骨架**:用 [`reference/article-template.md`](reference/article-template.md)。
5. **要更新成品目录**:改 [`reference/article-index.md`](reference/article-index.md)。

## 目录职责

| 目录 | 只负责什么 | 不负责什么 |
|---|---|---|
| `workflows/` | 操作步骤、方法论、最佳实践 | 记录当前完成了哪些文章 |
| `reference/` | 可复用参考件:模板、成品索引 | 记录待办状态 |
| `state/` | 当前项目状态:待办池、完成批次、进度 | 讲完整操作流程 |

## 当前关键文件

- [`../tools/check_article.py`](../tools/check_article.py):硬门槛校验器。文章必须通过它才算完成。
- [`../articles/`](../articles/):成品文章目录。这里应只放最终文章,不要放流程文档、模板或待办清单。
- [`../shareholders/`](../shareholders/) 与 [`../speech/`](../speech/):原始语料目录。所有引用必须逐字来自这里。

## 维护原则

- 一个文件只做一件事:流程归流程,状态归状态,模板归模板,索引归索引。
- 生成文章时,先按 `workflows/generate-articles-best-practices.md` 执行。
- 任何文章引用数、来源数、完成状态,都以 `tools/check_article.py` 的输出为准。
