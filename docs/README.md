# docs/ 文档导航

本目录只保留总入口。当前“语料到文章”的生产流程统一收在 `article-production/`,后续知识库网站文档可以另建目录,避免混在一起。

## 工作路径

1. 自己收集原始资料,加入 `shareholders/` 或 `speech/`。
2. AI 清洗原始语料:改错别字和符号,不改意思、不补事实。
3. 从原始资料提取关键词,写入关键词注册表。
4. 按文章模板把关键词生成 `articles/` 文章。
5. 运行校验,同步状态和成品索引。

## 先读哪份

| 场景 | 读 |
|---|---|
| 想了解全流程 | [`article-production/workflow/00-overview.md`](article-production/workflow/00-overview.md) |
| 新增原始资料 | [`article-production/workflow/01-build-corpus.md`](article-production/workflow/01-build-corpus.md) |
| 清洗语料 | [`article-production/workflow/02-clean-corpus.md`](article-production/workflow/02-clean-corpus.md) |
| 提取关键词 | [`article-production/workflow/03-extract-keywords.md`](article-production/workflow/03-extract-keywords.md) |
| 生成文章 | [`article-production/workflow/04-generate-articles.md`](article-production/workflow/04-generate-articles.md) |
| 校验和维护 | [`article-production/workflow/05-verify-and-maintain.md`](article-production/workflow/05-verify-and-maintain.md) |

## 状态文件

- [`article-production/state/corpus-manifest.md`](article-production/state/corpus-manifest.md):每篇原始资料的来源链接、书名/资料名、年份、清洗状态。
- [`article-production/state/keyword-registry.md`](article-production/state/keyword-registry.md):从语料提取出的关键词池和选词注意事项。
- [`article-production/state/article-status.md`](article-production/state/article-status.md):文章批次、总数、引用数和当前进度。

## 参考文件

- [`article-production/reference/article-template.md`](article-production/reference/article-template.md):单篇文章骨架。
- [`article-production/reference/article-style.md`](article-production/reference/article-style.md):写作语气、密度和禁忌。
- [`article-production/reference/article-index.md`](article-production/reference/article-index.md):成品文章索引。

## 总原则

- **正确第一**:原始资料、关键词、引用、事实都要可追溯。
- **先省时间**:材料不足的关键词不进入写作。
- **再省 token**:搜索优先,窄读优先,不整篇吞文件。
- **单一职责**:流程、状态、模板、索引分开维护。
