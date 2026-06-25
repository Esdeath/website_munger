#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验一篇芒格关键词文章:引用是否逐字来自语料、数量/来源是否达标、必备小节是否齐全。"""
import sys, re, glob, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS_DIRS = ["shareholders", "speech"]
MIN_QUOTES = 12          # 每篇 ≥12 处引用
MIN_SOURCES = 4          # 横跨 ≥4 个不同来源/年份
QUOTE_MINLEN = 6         # 短于此长度的引用片段不参与逐字核验(太短无意义)

# 各类引号:CJK 括号 + 中英文弯/直引号(用 \u 转义,避免源码里出现真实引号字符)
_QUOTE_RE = re.compile('[「」『』《》“”‘’"\']')  # 各类引号:CJK括号+中英弯/直引号

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
