# docs/ 文档导航

本目录只记录一件事:如何从固定 Markdown 语料生成 `articles/` 里的主题文章,并维护这套文章库。

当前项目的语料是 `shareholders/` 和 `speech/`。换到其他资料库时,仍然沿用同一套方法:固定语料、建立校验合同、窄读取证、生成文章、同步状态。

## 先读哪份

1. **要在本仓库继续生成文章**:读 [`workflows/generate-articles-best-practices.md`](workflows/generate-articles-best-practices.md)。
2. **要把方法迁移到另一个资料库**:读 [`workflows/corpus-to-articles-pipeline.md`](workflows/corpus-to-articles-pipeline.md)。
3. **要选题或看进度**:读 [`state/article-backlog.md`](state/article-backlog.md)。
4. **要创建单篇文章**:复制 [`reference/article-template.md`](reference/article-template.md)。
5. **要维护成品目录**:更新 [`reference/article-index.md`](reference/article-index.md)。

## 文件职责

| 文件 | 单一任务 | 不负责 |
|---|---|---|
| `workflows/generate-articles-best-practices.md` | 本仓库的逐步执行手册 | 方法论解释、状态记录 |
| `workflows/corpus-to-articles-pipeline.md` | 可迁移到其他资料库的通用方法 | 本仓库批次状态 |
| `state/article-backlog.md` | 选题池、完成状态、选词注意事项 | 完整操作流程 |
| `reference/article-template.md` | 单篇文章骨架 | 选题、索引、状态 |
| `reference/article-index.md` | 成品文章索引 | 写作规则、待办状态 |

## 维护原则

- **正确第一**:引用必须逐字来自语料,引用数和来源数以 `tools/check_article.py` 为准。
- **先省时间**:先搜索和预检,材料不足的题目不进入写作。
- **再省 token**:只读命中行附近上下文,不要把整篇语料塞进上下文。
- **单一职责**:流程归流程,状态归状态,模板归模板,索引归索引。

## 关键路径

- 原始语料:`../shareholders/`、`../speech/`
- 成品文章:`../articles/`
- 校验脚本:`../tools/check_article.py`
