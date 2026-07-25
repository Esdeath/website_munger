#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验一篇芒格关键词文章:引用是否逐字来自语料、数量/来源是否达标、必备小节是否齐全。

硬错误(FAIL):逐字核验、引用数、来源数、必备小节、frontmatter 必填字段、
              quote_count 与实际一致、每条引用必须带出处。
软提示(WARN):frontmatter 的 sources 列表与正文实际引用的来源对不上、
              某条引用与其他文章逐字重复(可能是有意复用,需人工判断)。
"""
import sys, re, glob, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS_DIRS = ["shareholders", "speech"]
ARTICLES_DIR = os.path.join(BASE, "articles")
NON_ARTICLE = {"_TEMPLATE.md", "README.md", "TODO.md"}
MIN_QUOTES = 12          # 每篇 ≥12 处引用
MIN_SOURCES = 4          # 横跨 ≥4 个不同来源/年份
QUOTE_MINLEN = 6         # 短于此长度的引用片段不参与逐字核验(太短无意义)

# 各类引号:CJK 括号 + 中英文弯/直引号(用 \u 转义,避免源码里出现真实引号字符)
_QUOTE_RE = re.compile('[「」『』《》“”‘’"\']')  # 各类引号:CJK括号+中英弯/直引号
_CITATION_RE = re.compile(r'^——《([^》]+)》.*$')


def is_valid_citation(text):
    match = _CITATION_RE.fullmatch(text)
    return bool(match and match.group(1).strip())

def normalize(s):
    s = s.replace('**', '')
    s = re.sub(r'[\s　]', '', s)   # 去掉所有空白(含全角空格 U+3000)
    s = _QUOTE_RE.sub('', s)           # 去掉各类引号
    return s

def load_corpus():
    parts = []
    for d in CORPUS_DIRS:
        for fp in glob.glob(os.path.join(BASE, d, "*.md")):
            with open(fp, encoding="utf-8") as f:
                parts.append(f.read())
    return normalize("\n".join(parts))

def load_other_essay_quotes(this_path):
    """收集 articles/ 下其他文章的引用片段(normalize 后),用于跨篇重复检测。
    返回 {fragment: 文件名}。短于 QUOTE_MINLEN 的片段忽略。"""
    out = {}
    this_abs = os.path.abspath(this_path)
    for fp in glob.glob(os.path.join(ARTICLES_DIR, "*.md")):
        if os.path.basename(fp) in NON_ARTICLE or os.path.abspath(fp) == this_abs:
            continue
        try:
            with open(fp, encoding="utf-8") as f:
                txt = f.read()
        except OSError:
            continue
        for qtext, _ in parse_quote_blocks(txt):
            for frag in re.split(r'……|\.\.\.|…', qtext):
                nf = normalize(frag)
                if len(nf) >= QUOTE_MINLEN:
                    out.setdefault(nf, os.path.basename(fp))
    return out

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
        nonblank = [x for x in grp if x]
        if not nonblank:
            continue
        if is_valid_citation(nonblank[-1]):
            out.append((" ".join(nonblank[:-1]), nonblank[-1]))
            continue
        joined = " ".join(nonblank)
        citation_marker = '——《'
        if citation_marker in joined:
            i = joined.rindex(citation_marker)
            citation = joined[i:]
            if is_valid_citation(citation):
                out.append((joined[:i].rstrip(), citation))
                continue
        out.append((joined, ""))
    return out

def main(path, check_dup=False):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    corpus = load_corpus()
    blocks = parse_quote_blocks(text)

    errors, warnings = [], []

    # 1) 逐字核验:每条引用的每个片段必须出现在语料中
    #    同时:每条引用必须带出处(——);可选地记录跨篇重复片段
    unverified = []
    uncited = 0
    other_quotes = load_other_essay_quotes(path) if check_dup else {}
    dup_hits = []
    real_quotes = 0
    for qtext, cite in blocks:
        if not qtext.strip():
            continue
        real_quotes += 1
        if not cite.strip():
            uncited += 1
        frags = [normalize(p) for p in re.split(r'……|\.\.\.|…', qtext)]
        for frag in frags:
            if len(frag) >= QUOTE_MINLEN and frag not in corpus:
                unverified.append((qtext[:40], frag[:40]))
            if check_dup and frag in other_quotes:
                dup_hits.append((qtext[:30], other_quotes[frag]))
    if unverified:
        for q, f in unverified:
            errors.append(f"引用未在语料中找到(疑似杜撰/错字): 「{q}…」 片段「{f}…」")
    if uncited:
        errors.append(f"有 {uncited} 条引用没有出处(每个 blockquote 组必须以『——《篇名》年份』结尾)")
    if check_dup and dup_hits:
        seen = set()
        for q, other in dup_hits:
            k = (q, other)
            if k in seen:
                continue
            seen.add(k)
            warnings.append(f"引用与《{other}》逐字重复: 「{q}…」(如属有意复用可忽略,否则换一条或换角度)")

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
    fm = ""
    if not text.startswith('---'):
        errors.append("缺少 frontmatter(应以 --- 开头)")
    else:
        m = re.match(r'---\n(.*?)\n---', text, re.S)
        fm = m.group(1) if m else ""
        for key in ('title', 'keyword', 'category'):
            if not re.search(rf'(?m)^{key}\s*:', text):
                errors.append(f"frontmatter 缺少字段 {key}")

    # 6) quote_count 必须等于实际引用数(ERR)
    mqc = re.search(r'(?m)^quote_count\s*:\s*(\d+)', fm)
    if mqc:
        declared = int(mqc.group(1))
        if declared != real_quotes:
            errors.append(f"frontmatter quote_count={declared} 与实际引用数 {real_quotes} 不一致")
    elif fm:
        warnings.append("frontmatter 缺少 quote_count 字段")

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
    args = [a for a in sys.argv[1:] if a != "--dup"]
    dup = "--dup" in sys.argv[1:]
    if len(args) != 1:
        print("usage: check_article.py [--dup] <article.md>")
        print("  --dup: 额外检查本篇引用是否与其他文章逐字重复(默认关闭,噪声较大)")
        sys.exit(2)
    sys.exit(main(args[0], check_dup=dup))
