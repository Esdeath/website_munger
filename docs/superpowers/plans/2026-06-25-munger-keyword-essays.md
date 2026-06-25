# 芒格关键词深度长文 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按"一类一篇"产出 8 篇芒格关键词深度长文(每篇 ~3500 字、≥12 处逐字引用、跨 ≥4 个来源/年份),全部引用经脚本验证确系语料库原文。

**Architecture:** 先建一个"防杜撰"验证脚本 `tools/check_article.py` 作为客观测试——它把文章里每条 blockquote 引用回到 83 篇语料中逐字核验,并统计引用数、来源数、检查必备小节。再建一个文章骨架模板 `articles/_TEMPLATE.md`。然后每篇文章 = 一个任务:grep 采集原文 → 选 ≥12 处 → 套模板成文 → 跑验证脚本(必须 PASS)→ 提交。

**Tech Stack:** Markdown 文稿;Python 3 标准库(验证脚本,无需第三方包);grep/ripgrep 采集原文。

设计文档:`docs/superpowers/specs/2026-06-25-munger-keyword-essays-design.md`

---

## 共享:文章生产流程(每篇任务都遵循)

1. **采集**:对该关键词及其同义表述跑 grep,带文件名和行号,汇总候选段落。
2. **核验+筛选**:逐字核对,选出 ≥12 处引用,确保横跨 ≥4 个不同来源/年份。
3. **成文**:复制 `articles/_TEMPLATE.md`,按 8 小节骨架填充;解读文字对照 voice 清单(逆向开路/格栅思维/俗语类比/毒舌简洁/案例驱动/道德底色/引经据典/谦逊自嘲/大白话)。
4. **验证**:`python3 tools/check_article.py articles/<文件>.md` 必须输出 `PASS`。
5. **提交**:单独 commit 这一篇。

引用格式约定(供脚本解析,务必遵守):
- 每条引用是一个 blockquote 组(连续的 `>` 行)。
- 引用正文逐字照抄原文;**原文加粗保留 `**`**。
- 出处写在该 blockquote 组内,以 `——` 开头:`> ——《篇名》年份` 或 `> ——场合 年份`。
- 引用内若省略中间内容,用 `……` 连接(脚本按 `……` 切片分别核验)。

---

## Task 1: 验证脚本 + 文章模板 + 语料索引

**Files:**
- Create: `tools/check_article.py`
- Create: `articles/_TEMPLATE.md`
- Create: `docs/superpowers/corpus-index.txt`

- [ ] **Step 1: 生成语料索引(列出 83 篇确切篇名,供写作时填出处)**

Run:
```bash
cd /Users/ruimin/Desktop/code/website_munger
{ echo "=== shareholders ==="; ls shareholders/*.md; echo; echo "=== speech ==="; ls speech/*.md; } > docs/superpowers/corpus-index.txt
wc -l docs/superpowers/corpus-index.txt
```
Expected: 文件生成,约 90 行。

- [ ] **Step 2: 写验证脚本 `tools/check_article.py`**

Create `tools/check_article.py`:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验一篇芒格关键词文章:引用是否逐字来自语料、数量/来源是否达标、必备小节是否齐全。"""
import sys, re, glob, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS_DIRS = ["shareholders", "speech"]
MIN_QUOTES = 12          # 每篇 ≥12 处引用
MIN_SOURCES = 4          # 横跨 ≥4 个不同来源/年份
QUOTE_MINLEN = 6         # 短于此长度的引用片段不参与逐字核验(太短无意义)

def normalize(s):
    s = s.replace('**', '')
    s = re.sub(r'[\s　]', '', s)                 # 去掉所有空白(含全角空格)
    for ch in '「」『』《》""“”‘’\'\"':
        s = s.replace(ch, '')
    return s

def load_corpus():
    parts = []
    for d in CORPUS_DIRS:
        for fp in glob.glob(os.path.join(BASE, d, "*.md")):
            with open(fp, encoding="utf-8") as f:
                parts.append(f.read())
    return normalize("\n".join(parts))

def parse_quote_blocks(text):
    """把连续的 '>' 行聚成 blockquote 组,返回 [(quote_text, citation_text), ...]"""
    blocks, cur = [], []
    for ln in text.splitlines():
        if ln.lstrip().startswith('>'):
            cur.append(ln.lstrip()[1:].strip())
        elif cur:
            blocks.append(cur); cur = []
    if cur:
        blocks.append(cur)
    out = []
    for grp in blocks:
        joined = " ".join(x for x in grp if x)
        if not joined.strip():
            continue
        if '——' in joined:
            i = joined.index('——')
            out.append((joined[:i], joined[i:]))
        else:
            out.append((joined, ""))
    return out

def main(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    corpus = load_corpus()
    blocks = parse_quote_blocks(text)

    errors, warnings = [], []

    # 1) 逐字核验:每条引用的每个片段必须出现在语料中
    unverified = []
    real_quotes = 0
    for qtext, cite in blocks:
        if not qtext.strip():
            continue
        real_quotes += 1
        frags = [normalize(p) for p in re.split(r'……|\.\.\.|…', qtext)]
        for frag in frags:
            if len(frag) >= QUOTE_MINLEN and frag not in corpus:
                unverified.append((qtext[:40], frag[:40]))
    if unverified:
        for q, f in unverified:
            errors.append(f"引用未在语料中找到(疑似杜撰/错字): 「{q}…」 片段「{f}…」")

    # 2) 引用数量
    if real_quotes < MIN_QUOTES:
        errors.append(f"引用数 {real_quotes} < {MIN_QUOTES}")

    # 3) 来源数量(去重的 citation 串)
    sources = set()
    for _, cite in blocks:
        c = cite.replace('——', '').strip()
        if c:
            sources.add(normalize(c))
    if len(sources) < MIN_SOURCES:
        errors.append(f"不同来源数 {len(sources)} < {MIN_SOURCES}(引用未跨足够来源/年份)")

    # 4) 必备小节(标题里必须出现这些关键词)
    headings = "\n".join(l for l in text.splitlines() if l.lstrip().startswith('#'))
    if not re.search(r'反过来想|逆向|反面', headings):
        errors.append("缺少『反过来想/逆向』小节")
    if not re.search(r'跨学科|心理学|数学|生物|物理|模型|透镜', headings):
        errors.append("缺少『跨学科透镜』小节")
    if not re.search(r'出处|索引|来源', headings):
        warnings.append("未发现『出处索引』小节标题")

    # 5) frontmatter
    if not text.startswith('---'):
        errors.append("缺少 frontmatter(应以 --- 开头)")
    else:
        for key in ('title', 'keyword', 'category'):
            if not re.search(rf'(?m)^{key}\s*:', text):
                errors.append(f"frontmatter 缺少字段 {key}")

    print(f"--- {os.path.basename(path)} ---")
    print(f"引用数: {real_quotes}  不同来源数: {len(sources)}")
    for w in warnings:
        print(f"  [WARN] {w}")
    if errors:
        print("FAIL")
        for e in errors:
            print(f"  [ERR] {e}")
        return 1
    print("PASS")
    return 0

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: check_article.py <article.md>"); sys.exit(2)
    sys.exit(main(sys.argv[1]))
```

- [ ] **Step 3: 自测脚本——构造一个含杜撰引用的临时文件,确认脚本能 FAIL**

Run:
```bash
cd /Users/ruimin/Desktop/code/website_munger
printf -- '---\ntitle: t\nkeyword: k\ncategory: c\n---\n# 反过来想\n# 跨学科透镜\n> 「这是一句根本不存在于语料库的假话。」\n> ——《伪造》2099\n' > /tmp/_fake.md
python3 tools/check_article.py /tmp/_fake.md; echo "exit=$?"
```
Expected: 输出 `FAIL`,含 `[ERR] 引用未在语料中找到…` 和引用数/来源数不足的报错,`exit=1`。

- [ ] **Step 4: 写文章模板 `articles/_TEMPLATE.md`**

Create `articles/_TEMPLATE.md`:

```markdown
---
title: 关键词:副标题
keyword: 关键词
category: 分类
quote_count: 0
sources:
  - 篇名(年份)
date: 2026-06-25
---

> 「（题记:一句芒格最锋利的原话,逐字照抄。）」
> ——《篇名》年份

## 一、〔钩子〕

（~200字。用悖论/反差/现实场景把读者拉进来,抛出关键词。）

## 二、他怎么定义

（~400字。芒格自己的定义,引 1-2 处原文;点出思想来源。）

> 「（引用,逐字。）」
> ——《篇名》年份

## 三、跨年代的回响

（~700字。按时间线证明他"常说":不同年份/场合反复强调,引 3-4 处,每条标年份。）

## 四、反过来想

（~500字。从反面定义——不具备/违反它会怎样;引"避免愚蠢"式原话 + 反面案例。）

## 五、跨学科透镜

（~600字。用心理学/数学/生物学/物理学模型解释"为什么成立";引他用某学科论证的原文。）

## 六、落到实处

（~500字。一个真实案例;引相关原文,展示概念如何变成真金白银。）

## 七、边界与误读

（~250字。最易被误用之处;芒格给的限定条件。）

## 八、给今天的你

（~300字。落到可操作的判断/行为;结尾再引一句呼应题记。）

## 出处索引

1. 《篇名》年份
```

- [ ] **Step 5: 提交**

```bash
cd /Users/ruimin/Desktop/code/website_munger
git add tools/check_article.py articles/_TEMPLATE.md docs/superpowers/corpus-index.txt
git commit -m "tooling: 文章验证脚本 + 模板 + 语料索引"
```

---

## Task 2: 《能力圈:知道自己不知道什么》(投资原则)

**Files:**
- Create: `articles/能力圈-知道自己不知道什么.md`

**目标来源(至少跨这 4 类年份/场合):** 1994 南加大演讲、误判心理学/哈佛、西科金融股东会、每日期刊股东会。

- [ ] **Step 1: 采集原文**

Run:
```bash
cd /Users/ruimin/Desktop/code/website_munger
grep -rn -E "能力圈|能力的边界|太难|做不到|不懂|篮子|看不懂|搞不懂|拒绝" shareholders speech | head -80
```
把命中段落连同**文件名**记下,回到对应 `.md` 文件读上下文,确认逐字与出处年份。

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

筛选要点(各节大致分配):
- 定义节:芒格对"知道自己能力边界"的直接表述。
- 跨年代节:不同年份重复这一主张(1994 / 西科某年 / 每日期刊某年)。
- 反过来想节:超出能力圈、自欺、"太难就放进太难的篮子"。
- 跨学科节:用心理学(自我服务偏误/过度自信)解释人为何高估能力。
- 案例节:芒格/伯克希尔放弃看不懂的机会(如早期错过科技股、"太难"篮子)。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/能力圈-知道自己不知道什么.md"
```
按 8 小节填充,frontmatter 写 `keyword: 能力圈`、`category: 投资原则`、`quote_count` 填实际数、`sources` 列出实际篇目。引用逐字、出处以 `——` 开头。

- [ ] **Step 4: 验证(必须 PASS)**

Run:
```bash
python3 tools/check_article.py "articles/能力圈-知道自己不知道什么.md"; echo "exit=$?"
```
Expected: `PASS`,`exit=0`,引用数 ≥12、来源数 ≥4。若 FAIL,按报错补引用/换真原文/补小节,直到 PASS。

- [ ] **Step 5: 提交**

```bash
git add "articles/能力圈-知道自己不知道什么.md"
git commit -m "article: 能力圈"
```

---

## Task 3: 《多元思维模型:把知识挂上格栅》(思维方法)

**Files:**
- Create: `articles/多元思维模型-把知识挂上格栅.md`

**目标来源:** 1994 南加大演讲、1996 斯坦福演讲、1998 哈佛"跨学科技能"演讲、25 种人类误判心理学。

- [ ] **Step 1: 采集原文**

Run:
```bash
grep -rn -E "思维模型|多元|格栅|跨学科|多学科|铁锤|锤子|钉子|学科|框架" shareholders speech | head -80
```

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

分配:
- 定义节:"必须拥有多元思维模型""把经验挂在思维模型的框架上"(1994)。
- 跨年代节:1996 斯坦福、1998 哈佛重复跨学科主张。
- 反过来想节:"手里拿着铁锤的人,看什么都像钉子"——单一模型的灾难。
- 跨学科节:芒格点名的几门关键学科(数学/会计/物理/生物/心理),各引一处。
- 案例节:用多模型叠加(lollapalooza)解释某现象(如喜诗/可乐/上瘾)。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/多元思维模型-把知识挂上格栅.md"
```
frontmatter:`keyword: 多元思维模型`、`category: 思维方法`。

- [ ] **Step 4: 验证**

Run: `python3 tools/check_article.py "articles/多元思维模型-把知识挂上格栅.md"; echo "exit=$?"`
Expected: `PASS`,`exit=0`。

- [ ] **Step 5: 提交**

```bash
git add "articles/多元思维模型-把知识挂上格栅.md"
git commit -m "article: 多元思维模型"
```

---

## Task 4: 《激励机制:永远别低估它的力量》(人性偏误)

**Files:**
- Create: `articles/激励机制-永远别低估它的力量.md`

**目标来源:** 25 种人类误判心理学、1995 哈佛法学院演讲、西科金融股东会、每日期刊股东会。

- [ ] **Step 1: 采集原文**

Run:
```bash
grep -rn -E "激励|奖励|惩罚|联邦快递|施乐|Xerox|佣金|回报|动机|利益" shareholders speech | head -80
```

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

分配:
- 定义节:"激励超级反应倾向";"永远不要低估激励的力量"类表述。
- 跨年代节:不同场合重复(误判心理学 / 哈佛 / 股东会)。
- 反过来想节:错误激励导致的恶果(代理问题、销售误导、会计造假)。
- 跨学科节:用心理学(巴甫洛夫/操作性条件反射)+ 经济学解释。
- 案例节:联邦快递夜班按班次而非按小时付薪;施乐;券商佣金。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/激励机制-永远别低估它的力量.md"
```
frontmatter:`keyword: 激励机制`、`category: 人性偏误`。

- [ ] **Step 4: 验证**

Run: `python3 tools/check_article.py "articles/激励机制-永远别低估它的力量.md"; echo "exit=$?"`
Expected: `PASS`,`exit=0`。

- [ ] **Step 5: 提交**

```bash
git add "articles/激励机制-永远别低估它的力量.md"
git commit -m "article: 激励机制"
```

---

## Task 5: 《诚信与声誉:最值钱的资产》(品格处世)

**Files:**
- Create: `articles/诚信与声誉-最值钱的资产.md`

**目标来源:** 2007 南加大毕业演讲、所罗门事件相关(西科/股东会)、每日期刊股东会、访谈类(喻见/红周刊)。

- [ ] **Step 1: 采集原文**

Run:
```bash
grep -rn -E "声誉|信任|信誉|诚信|正直|诚实|可靠|值得信赖|靠谱|名声|所罗门" shareholders speech | head -80
```

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

分配:
- 定义节:芒格对"值得信赖/声誉"的论述(2007 给毕业生的建议)。
- 跨年代节:不同场合反复强调诚信优先。
- 反过来想节:声誉如何一夜崩塌(所罗门;欺诈;走捷径)。
- 跨学科节:用心理学(信任/互惠/一致性)+ 博弈(长期重复博弈)解释。
- 案例节:所罗门危机中巴菲特/芒格如何处理;或"卖掉最好的东西即声誉"。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/诚信与声誉-最值钱的资产.md"
```
frontmatter:`keyword: 诚信与声誉`、`category: 品格处世`。

- [ ] **Step 4: 验证**

Run: `python3 tools/check_article.py "articles/诚信与声誉-最值钱的资产.md"; echo "exit=$?"`
Expected: `PASS`,`exit=0`。

- [ ] **Step 5: 提交**

```bash
git add "articles/诚信与声誉-最值钱的资产.md"
git commit -m "article: 诚信与声誉"
```

---

## Task 6: 《本杰明·富兰克林:芒格的终身偶像》(常引用人物)

**Files:**
- Create: `articles/本杰明富兰克林-芒格的终身偶像.md`

**目标来源:** 1994 南加大演讲、2007 南加大毕业演讲、1996 斯坦福演讲、其他点名富兰克林处。

- [ ] **Step 1: 采集原文**

Run:
```bash
grep -rn -E "富兰克林|本·富兰克林|本杰明|穷理查|节俭|美德|储蓄" shareholders speech | head -80
```

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

分配:
- 定义节:芒格为何推崇富兰克林(多才、务实、自我教育)。
- 跨年代节:不同演讲反复援引富兰克林的格言/做法。
- 反过来想节:富兰克林式的"避免愚蠢/恶习"。
- 跨学科节:富兰克林作为跨学科通才的范本——呼应多元思维。
- 案例节:富兰克林的具体格言被芒格用于投资/处世(如复利、节俭、声誉)。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/本杰明富兰克林-芒格的终身偶像.md"
```
frontmatter:`keyword: 本杰明·富兰克林`、`category: 常引用人物`。

- [ ] **Step 4: 验证**

Run: `python3 tools/check_article.py "articles/本杰明富兰克林-芒格的终身偶像.md"; echo "exit=$?"`
Expected: `PASS`,`exit=0`。

- [ ] **Step 5: 提交**

```bash
git add "articles/本杰明富兰克林-芒格的终身偶像.md"
git commit -m "article: 本杰明·富兰克林"
```

---

## Task 7: 《喜诗糖果:一堂关于定价权的课》(公司案例)

**Files:**
- Create: `articles/喜诗糖果-一堂关于定价权的课.md`

**目标来源:** 蓝筹印花致股东信(1977–1982)、1994/1998 演讲、每日期刊股东会、2023《Acquired》播客。

- [ ] **Step 1: 采集原文**

Run:
```bash
grep -rn -E "喜诗|See|提价|涨价|定价|品牌|商誉|糖果|护城河" shareholders speech | head -80
```

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

分配:
- 定义节:喜诗是什么、为何成为伯克希尔的转折点。
- 跨年代节:蓝筹印花年报里的喜诗经营数据 + 后来演讲里反复复盘。
- 反过来想节:若没有品牌/定价权会怎样;"为有形资产付高价"的反直觉。
- 跨学科节:用心理学(钟爱/巴甫洛夫式联想、节日送礼的社会认同)解释定价权来源。
- 案例节:喜诗历年提价却不流失客户、低再投入高现金流。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/喜诗糖果-一堂关于定价权的课.md"
```
frontmatter:`keyword: 喜诗糖果`、`category: 公司案例`。

- [ ] **Step 4: 验证**

Run: `python3 tools/check_article.py "articles/喜诗糖果-一堂关于定价权的课.md"; echo "exit=$?"`
Expected: `PASS`,`exit=0`。

- [ ] **Step 5: 提交**

```bash
git add "articles/喜诗糖果-一堂关于定价权的课.md"
git commit -m "article: 喜诗糖果"
```

---

## Task 8: 《心理学:经济学最该补的一课》(学科体系)

**Files:**
- Create: `articles/心理学-经济学最该补的一课.md`

**目标来源:** 25 种人类误判心理学、1995 哈佛法学院演讲、2003 圣塔巴巴拉"经济学九大缺点"演讲、西科/每日期刊股东会。

- [ ] **Step 1: 采集原文**

Run:
```bash
grep -rn -E "心理学|误判|倾向|偏见|行为|人性|理性|非理性|学院派|经济学" shareholders speech | head -80
```

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

分配:
- 定义节:芒格为何把心理学当作核心学科。
- 跨年代节:从哈佛(1995)到圣塔巴巴拉(2003)反复批评主流学科忽视心理学。
- 反过来想节:不懂心理学 → 被误导、被操纵、决策失灵。
- 跨学科节:心理学如何与经济学/生物学/数学叠加(lollapalooza)。
- 案例节:用某条具体偏误(激励/嫉妒/社会认同)解释一个真实商业现象。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/心理学-经济学最该补的一课.md"
```
frontmatter:`keyword: 心理学`、`category: 学科体系`。

- [ ] **Step 4: 验证**

Run: `python3 tools/check_article.py "articles/心理学-经济学最该补的一课.md"; echo "exit=$?"`
Expected: `PASS`,`exit=0`。

- [ ] **Step 5: 提交**

```bash
git add "articles/心理学-经济学最该补的一课.md"
git commit -m "article: 心理学"
```

---

## Task 9: 《投机与赌博:聪明人的慢性毒药》(宏观警示)

**Files:**
- Create: `articles/投机与赌博-聪明人的慢性毒药.md`

**目标来源:** 2023 华尔街日报"应禁加密货币"、CNBC/雅虎等访谈、1998/2000 演讲、每日期刊股东会。

- [ ] **Step 1: 采集原文**

Run:
```bash
grep -rn -E "投机|赌博|赌场|加密货币|比特币|老鼠药|彩票|杠杆|泡沫|狂热|投机倒把" shareholders speech | head -80
```

- [ ] **Step 2: 选 ≥12 处引用,跨 ≥4 来源**

分配:
- 定义节:芒格如何区分投资与投机/赌博。
- 跨年代节:从早年到 2023 反复抨击投机(加密货币、当冲、期权)。
- 反过来想节:把市场当赌场的下场;杠杆 + 投机的毁灭性。
- 跨学科节:用心理学(嫉妒、社会认同、巴甫洛夫式刺激)解释赌博为何上瘾。
- 案例节:加密货币("老鼠药/性病")、1929/2008 投机泡沫、券商鼓励频繁交易。

- [ ] **Step 3: 成文**

```bash
cp articles/_TEMPLATE.md "articles/投机与赌博-聪明人的慢性毒药.md"
```
frontmatter:`keyword: 投机与赌博`、`category: 宏观警示`。

- [ ] **Step 4: 验证**

Run: `python3 tools/check_article.py "articles/投机与赌博-聪明人的慢性毒药.md"; echo "exit=$?"`
Expected: `PASS`,`exit=0`。

- [ ] **Step 5: 提交**

```bash
git add "articles/投机与赌博-聪明人的慢性毒药.md"
git commit -m "article: 投机与赌博"
```

---

## Task 10: 收尾——目录索引

**Files:**
- Create: `articles/README.md`

- [ ] **Step 1: 写 8 篇文章的索引页**

Create `articles/README.md`,按分类列出 8 篇文章的标题与相对链接,每篇附一句话提要(取自该文题记或核心论点)。

- [ ] **Step 2: 全量复验所有文章**

Run:
```bash
cd /Users/ruimin/Desktop/code/website_munger
for f in articles/*.md; do [ "$(basename "$f")" = "_TEMPLATE.md" ] && continue; [ "$(basename "$f")" = "README.md" ] && continue; python3 tools/check_article.py "$f"; done
```
Expected: 8 篇全部 `PASS`。

- [ ] **Step 3: 提交**

```bash
git add articles/README.md
git commit -m "article: 索引页 + 全量复验通过"
```

---

## 验证脚本说明(给执行者)

- 脚本的核心是**逐字核验**:把文章每条 blockquote(去掉 `——出处` 后)按 `……` 切片,每个 ≥6 字的片段都必须是语料(83 篇拼接后去空白/引号/加粗)的子串。任何对不上 → FAIL。这从机制上杜绝杜撰和错字。
- 因此**引用必须从语料里复制**,不能凭记忆默写;省略中间内容用 `……`。
- 若某条引用因原文跨行/含特殊标点导致误报,优先调整引用为更连续的原文片段,而非放宽脚本。
