# 从语料生成 articles 的最佳实践

这份文档是以后重复执行同类任务的操作手册。目标是从 `shareholders/` 和 `speech/` 的 Markdown 语料中,生成 `articles/` 里的逐字可考文章。

## 适用场景

- 要新增一篇或一批芒格关键词文章。
- 要把一组固定语料转成主题文章。
- 要确保文章里的引用都能被机器逐字核验。

不适用:
- 只想改某篇文章的措辞。
- 只想整理索引或待办状态。
- 没有固定语料来源的自由写作。

## 一次标准执行顺序

### 1. 确认当前工作区

先确认有没有未提交改动,避免把无关改动混进本批文章。

```bash
git status --short
```

如果已经有未提交改动,先判断是否与本批文章相关。相关就继续维护;不相关就不要改它。

### 2. 从待办池选题

打开 [`../state/article-backlog.md`](../state/article-backlog.md),按这三个标准挑题:

1. 覆盖广:关键词在 `shareholders/` 和 `speech/` 中出现的来源够多。
2. 能差异化:不要和已写文章重复同一组引文和同一角度。
3. 能过门槛:预计能凑够至少 12 处引用、4 个来源。

如果是批量执行,优先每批 3 篇。三篇之间尽量跨分类,例如一个投资原则、一个思维方法、一个公司案例。

### 3. 做可行性预检

先用关键词和同义词跑搜索,确认材料足够。

```bash
grep -rn -E "关键词|同义词|相关比喻" shareholders speech
```

判断时不要只看命中次数,还要看命中文件数。一个词在同一篇里出现很多次,不等于能满足多来源要求。

### 4. 预挖候选引用

为每个题目整理 `file:line` 候选清单。只读命中行附近上下文,不要整篇吞文件。

推荐做法:

```bash
grep -rn -E "关键词|同义词|相关比喻" shareholders speech | head -80
```

筛选候选时按年代、场合、来源类型分层取样。目标是先拿到 6-8 个高质量来源,再从中选择引用。

### 5. 复制模板创建文章

从模板生成新文章文件。

```bash
cp docs/reference/article-template.md "articles/关键词-副标题.md"
```

文件名用中文关键词和明确副标题。副标题应表达文章角度,不要只重复关键词。

### 6. 写作时只复制原文引用

引用必须直接从 `shareholders/` 或 `speech/` 复制,不要凭记忆改写。尤其注意:

- 保留原始中文标点。
- 不要把半角标点替换成全角,也不要反过来。
- 每组 blockquote 后都要有出处行,格式为 `——《篇名》年份`。
- 不要把提问者、编者导言或第三方的话当作芒格的话。

正文解读可以用编者口吻,但引用本身必须逐字来自语料。

### 7. 先让单篇通过校验

写完一篇就立刻跑校验。

```bash
python3 tools/check_article.py "articles/关键词-副标题.md"
```

必须看到 `PASS`。如果失败,按脚本报错修:

- `引用未在语料中找到`:回源文件重新复制原文。
- `quote_count 不一致`:用脚本输出的真实引用数更新 frontmatter。
- `来源数不足`:补不同来源的引用。
- `缺少小节`:补齐模板要求的小节。

### 8. 做人工事实核查

校验脚本只能证明“逐字存在”,不能证明“用得对”。每篇至少核查这些点:

- 出处年份是否和源文件一致。
- 说话人是否真是芒格。
- 引文是否被用来证明它没有表达的结论。
- 数字、年龄、价格、年份是否只来自语料。
- 副标题和关键比喻是否有原文依据。

发现问题就直接改文章,然后重新跑单篇校验。

### 9. 更新状态和索引

单篇或本批全部通过后,更新两个文件:

- [`../state/article-backlog.md`](../state/article-backlog.md):勾选完成项、更新批次、引用总数。
- [`../reference/article-index.md`](../reference/article-index.md):加入文章链接、题记、摘要、引用数。

引用数必须来自 `tools/check_article.py`,不要手估。

### 10. 全量复验

本批收尾前,跑完整文章目录校验。

```bash
ruby -ropen3 -e 'files=Dir["articles/*.md"].sort; files.each do |f|; out,err,status=Open3.capture3("python3","tools/check_article.py",f); unless status.success?; puts "FAIL #{f}"; puts out; puts err; exit 1; end; end; puts "PASS all #{files.size} article files"'
```

预期输出类似:

```text
PASS all 70 article files
```

### 11. 做最终工作区检查

```bash
git diff --check
git status --short
```

`git diff --check` 必须没有输出。`git status --short` 用来确认本批只包含预期文件。

### 12. 提交

如果用户要求提交,按本批范围提交。常用提交信息:

```bash
git add articles docs/state/article-backlog.md docs/reference/article-index.md
git commit -m "article: 关键词"
```

批量三篇时:

```bash
git add articles docs/state/article-backlog.md docs/reference/article-index.md
git commit -m "article: 第 N 批三篇"
```

## 质量标准

一篇文章完成,必须同时满足:

- 文件在 `articles/` 下。
- 使用 [`../reference/article-template.md`](../reference/article-template.md) 的八节骨架。
- 至少 12 处逐字引用。
- 至少 4 个不同来源。
- frontmatter 的 `quote_count` 等于脚本统计。
- `python3 tools/check_article.py <file>` 输出 `PASS`。
- 人工核查过出处、说话人、语义、数字事实。
- 已同步待办状态和成品索引。

## 最容易犯的错

- 只追求脚本 PASS,但文章解释太薄。脚本是底线,不是文章质量上限。
- 手打引文导致标点或字词偏差。引文必须复制。
- 只从一个高频来源取材料,导致来源数不够或视角单薄。
- 把 `docs/state/article-backlog.md` 当流程文档写。它只记录状态。
- 把 `docs/reference/article-index.md` 当写作说明写。它只维护成品索引。
- 忘记用脚本真实输出更新 `quote_count` 和引用总数。

## 学习复盘

每批结束后,用三分钟记录这三个问题:

1. 哪个关键词最难找材料,为什么?
2. 哪条引用最容易误用,最后如何处理?
3. 这批暴露了什么新的选词坑、格式坑或事实核查坑?

如果答案会影响后续选题,写进 [`../state/article-backlog.md`](../state/article-backlog.md) 的“选词注意事项”。如果只是一次性经验,保留在本次提交说明中。
