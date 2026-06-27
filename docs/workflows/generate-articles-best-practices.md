# 从本仓库语料生成 articles 的最佳实践

这份文档是操作手册:以后在本仓库从 `shareholders/` 和 `speech/` 生成 `articles/` 文章时,按这里执行。
通用方法论和迁移到其他资料库的说明见 [`corpus-to-articles-pipeline.md`](corpus-to-articles-pipeline.md)。

## 适用场景

适用:

- 新增一篇或一批芒格关键词文章。
- 修复某篇文章的引用、来源数、结构或论述密度。
- 在固定语料中做可验证的主题写作。

不适用:

- 只整理索引或待办状态。
- 没有固定语料来源的自由写作。
- 只做纯文案润色且不碰引用和事实。

## 三条优先级

1. **正确第一**
   引用必须逐字复制自 `shareholders/` 或 `speech/`;事实、年份、数字、人物归属必须来自语料或能由语料直接推出。

2. **先省时间**
   写作前先做覆盖预检。材料不足、角度重复、来源单薄的题目先搁置,不要进入正文写作。

3. **再省 token**
   用 `rg` 找命中行,只读附近上下文。不要把整篇源文档或整批文章一次性塞进上下文。

## 标准执行顺序

### 1. 确认工作区

```bash
git status --short
```

如果有未提交改动:

- 和本批文章相关:继续维护,不要覆盖。
- 和本批文章无关:不要触碰。

### 2. 选题

打开 [`../state/article-backlog.md`](../state/article-backlog.md),按三个条件选题:

- **读者需求明确**:这篇文章能回答一个具体判断问题,不是只解释一个名词。
- **语料覆盖足够**:预计至少能找到 12 处引用、4 个不同来源。
- **角度能区分**:不重复已完成文章的核心引文和论证角度。

批量执行时,优先每批 3 篇。三篇之间尽量跨分类,例如投资原则、思维方法、公司案例各一篇。

### 3. 覆盖预检

先搜索关键词、同义词、英文名、案例名和常用比喻:

```bash
rg -n "关键词|同义词|英文名|相关案例|相关比喻" shareholders speech
```

判断时看两个数:

- 命中文件数:决定来源是否足够分散。
- 有效上下文数:决定能否支撑一篇有解释深度的文章。

低覆盖题不要硬写。先换角度、换关键词,或放回待办池备注。

### 4. 建候选证据清单

为每个题目记录候选引用,格式用 `file:line`。只读命中行上下各几十行:

```bash
rg -n -C 3 "关键词|同义词|英文名|相关案例|相关比喻" shareholders speech
```

筛选候选时优先:

- 跨年份:证明这是反复出现的思想。
- 跨场合:致股东信、演讲、访谈尽量分散。
- 跨用途:定义、反例、案例、边界都要有证据。

不要为了凑数量摘同一段的连续短句。引用多但来源单薄,文章会薄。

### 5. 定文章角度

写正文前先确定三句话:

1. 这篇文章解决读者什么问题?
2. 芒格在这个问题上的核心判断是什么?
3. 这个主题最容易被怎样误读?

这三句话决定副标题、题记和八节结构。没有清楚角度时,先不要创建文章文件。

### 6. 创建文章

从模板复制:

```bash
cp docs/reference/article-template.md "articles/关键词-副标题.md"
```

文件名要求:

- 包含关键词。
- 副标题表达具体角度。
- 不使用空泛词,例如“深度解析”“全面解读”。

### 7. 写作规则

引用规则:

- blockquote 必须逐字复制自 `shareholders/` 或 `speech/`。
- 不手打引文,不凭记忆改标点。
- 每组 blockquote 必须包含出处行:`——《篇名》年份`。
- 不把提问者、编者导言、第三方评论当成芒格的话。
- 引文内部如果出现会干扰脚本的 `——`,优先换一条更短的逐字片段。

正文规则:

- 正文用第三人称解读体,不要伪装成芒格原话。
- 每节都要承担一个功能:定义、时间线、反面、跨学科、案例、边界、行动。
- 抽象判断必须配案例或反例。
- 不用脚本 PASS 代替文章质量。解释太薄时,继续补论述、例子、误读和边界。

### 8. 单篇校验

写完一篇立刻运行:

```bash
python3 tools/check_article.py "articles/关键词-副标题.md"
```

必须看到 `PASS`。

常见失败处理:

| 报错 | 处理 |
|---|---|
| `引用未在语料中找到` | 回源文件重新复制原文 |
| `quote_count 不一致` | 用脚本输出的真实引用数更新 frontmatter |
| `不同来源数 < 4` | 补不同来源或不同年份的引用 |
| `缺少反过来想/逆向小节` | 补足反面定义和失败路径 |
| `缺少跨学科透镜小节` | 用心理学、数学、生物、物理或模型解释原因 |
| `有引用没有出处` | 给每组 blockquote 补 `——《篇名》年份` |

### 9. 人工事实核查

机器只能证明“文本存在”,不能证明“用得正确”。每篇至少核查:

- 出处年份是否和源文件一致。
- 说话人是否真是芒格。
- 引文是否被用来证明它没有表达的结论。
- 数字、价格、年龄、日期是否来自语料。
- 副标题、题记、关键比喻是否有原文依据。
- 同一主题是否和旧文章重复太多。

涉及人物、公司、历史事件时,优先回看上下文,不要只看单句。

### 10. 同步状态和索引

单篇或本批全部通过后,更新:

- [`../state/article-backlog.md`](../state/article-backlog.md):勾选完成项、更新批次、引用总数、选词注意事项。
- [`../reference/article-index.md`](../reference/article-index.md):加入文章链接、题记、摘要、引用数。

引用数必须来自 `tools/check_article.py`,不要手估。

### 11. 全量复验

批次收尾前运行:

```bash
ruby -ropen3 -e 'files=Dir["articles/*.md"].sort; files.each do |f|; out,err,status=Open3.capture3("python3","tools/check_article.py",f); unless status.success?; puts "FAIL #{f}"; puts out; puts err; exit 1; end; end; puts "PASS all #{files.size} article files"'
```

预期输出:

```text
PASS all 70 article files
```

如果只是整理 `docs/`,不用跑全量文章校验;改了 `articles/` 才需要跑。

### 12. 收尾检查

```bash
git diff --check
git status --short
```

确认 `git diff --check` 没有输出,`git status --short` 只包含本次预期文件。

### 13. 提交

只有用户要求提交时才提交。

单篇:

```bash
git add articles docs/state/article-backlog.md docs/reference/article-index.md
git commit -m "article: 关键词"
```

三篇批次:

```bash
git add articles docs/state/article-backlog.md docs/reference/article-index.md
git commit -m "article: 第 N 批三篇"
```

只整理文档:

```bash
git add docs
git commit -m "docs: 整理文章生成流程"
```

## 完成标准

一篇文章完成,必须同时满足:

- 位于 `articles/`。
- 使用 [`../reference/article-template.md`](../reference/article-template.md) 的八节骨架。
- 至少 12 处逐字引用。
- 至少 4 个不同来源。
- frontmatter 的 `quote_count` 等于脚本统计。
- `python3 tools/check_article.py <file>` 输出 `PASS`。
- 人工核查过出处、说话人、语义、数字事实和误读风险。
- 论述密度接近既有长文,不只是结构完整。
- 已同步状态清单和成品索引。

## 最容易犯的错

- 只追求脚本 PASS,但文章解释太薄。
- 引用靠手打,导致标点、空格或字词偏差。
- 只从一个高频来源取材料,导致来源数不够或视角单薄。
- 低覆盖题没有预检就进入写作。
- 把流程写进 `docs/state/article-backlog.md`。
- 把写作规则写进 `docs/reference/article-index.md`。
- 忘记用脚本真实输出更新 `quote_count` 和引用总数。

## 批次复盘

每批结束后,只记录会影响下次执行的信息:

1. 哪个关键词材料不足或角度重叠?
2. 哪条引用最容易误用,最后如何处理?
3. 哪个格式坑或事实核查坑会再次出现?

会影响后续选题的,写进 [`../state/article-backlog.md`](../state/article-backlog.md) 的“选词注意事项”。一次性经验不进状态清单,保留在提交说明中即可。
