# 总流程

这套文档服务一条固定路径:

```text
原始资料入库 -> AI 清洗语料 -> 提取关键词 -> 生成文章 -> 校验维护
```

## 阶段边界

| 阶段 | 输入 | 输出 | 状态文件 |
|---|---|---|---|
| 建立语料库 | 外部资料 | `shareholders/`、`speech/` 原始 Markdown | `state/corpus-manifest.md` |
| 清洗语料 | 原始 Markdown | 可检索、少错字、符号统一的 Markdown | `state/corpus-manifest.md` |
| 提取关键词 | 已清洗语料 | 候选关键词、分类、代表来源 | `state/keyword-registry.md` |
| 生成文章 | 关键词 + 证据 | `articles/*.md` | `state/article-status.md`、`reference/article-index.md` |
| 校验维护 | 文章和状态 | 校验通过的文章库 | `state/article-status.md` |

## 优先级

1. **正确第一**:不为了省时间改写引文、补造事实、猜测来源。
2. **再省时间**:先预检来源和覆盖,不写材料不足的题。
3. **最后省 token**:用搜索和局部上下文工作,不把全量资料塞进上下文。

## 文件职责

- `workflow/`:只写操作步骤。
- `state/`:只写当前状态和可维护清单。
- `reference/`:只写模板、风格和成品索引。
- `articles/`:只放最终文章。
