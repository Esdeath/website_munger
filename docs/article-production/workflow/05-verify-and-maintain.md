# 05 校验与维护

本阶段只负责确认文章和状态都可靠。

## 单篇校验

```bash
python3 tools/check_article.py "articles/关键词-副标题.md"
```

必须看到 `PASS`。

常见失败:

| 报错 | 处理 |
|---|---|
| `引用未在语料中找到` | 回源文件重新复制原文 |
| `quote_count 不一致` | 用脚本输出更新 frontmatter |
| `不同来源数 < 4` | 补不同来源或年份 |
| `缺少反过来想/逆向小节` | 补反面定义和失败路径 |
| `缺少跨学科透镜小节` | 补心理学、数学、生物、物理或模型解释 |
| `有引用没有出处` | 补 `——《篇名》年份` |

## 人工核查

机器只能证明“文本存在”。还要人工确认:

- 出处年份和源文件一致。
- 说话人真是芒格。
- 引文没有被过度外推。
- 数字、价格、年龄、日期来自语料。
- 副标题、题记、关键比喻有原文依据。
- 和旧文章没有过度重复。

## 状态同步

文章通过后更新:

- [`../state/article-status.md`](../state/article-status.md):批次、文章数、引用总数。
- [`../state/keyword-registry.md`](../state/keyword-registry.md):关键词状态。
- [`../reference/article-index.md`](../reference/article-index.md):成品文章索引。

引用数必须来自 `tools/check_article.py`,不要手估。

## 收尾验证

改了 `articles/` 时跑全量文章校验:

```bash
ruby -ropen3 -e 'files=Dir["articles/*.md"].sort; files.each do |f|; out,err,status=Open3.capture3("python3","tools/check_article.py",f); unless status.success?; puts "FAIL #{f}"; puts out; puts err; exit 1; end; end; puts "PASS all #{files.size} article files"'
```

任何批次都要跑:

```bash
git diff --check
git status --short
```
