#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验 stop-doing/不可为清单.md:
- 每条 blockquote 引语逐字来自语料(shareholders/ + speech/)
- 每条出处篇名能在语料文件名/标题中找到
- 每个 ## 分组标题是 site.ts TOPICS 里的合法主题 title
通过打印 PASS / exit 0;失败打印 FAIL + [ERR] / exit 1。
"""
import sys, re, glob, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS_DIRS = ["shareholders", "speech"]
CONTENT = os.path.join(BASE, "stop-doing", "不可为清单.md")
SITE_TS = os.path.join(BASE, "src", "content", "site.ts")
QUOTE_MINLEN = 6

_QUOTE_RE = re.compile('[「」『』《》“”‘’"\']')


def normalize(s):
    s = s.replace('**', '')
    s = re.sub(r'[\s　]', '', s)
    s = _QUOTE_RE.sub('', s)
    return s


def load_corpus():
    parts = []
    for d in CORPUS_DIRS:
        for fp in glob.glob(os.path.join(BASE, d, "*.md")):
            with open(fp, encoding="utf-8") as f:
                parts.append(f.read())
    return normalize("\n".join(parts))


def load_corpus_titles():
    """语料文件名(去扩展名)+ 文件内首个 # 标题,normalize 后用于出处存在性核验。"""
    titles = []
    for d in CORPUS_DIRS:
        for fp in glob.glob(os.path.join(BASE, d, "*.md")):
            titles.append(normalize(os.path.splitext(os.path.basename(fp))[0]))
            with open(fp, encoding="utf-8") as f:
                m = re.search(r'(?m)^#\s+(.+)$', f.read())
                if m:
                    titles.append(normalize(m.group(1)))
    return titles


def load_topic_titles():
    """从 site.ts 的 TOPICS 数组中提取主题 title(只在 TOPICS 块内匹配,避免误收其他 title 字段)。"""
    with open(SITE_TS, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r'TOPICS[^=]*=\s*\[(.*?)\n\]', src, re.S)
    block = m.group(1) if m else ""
    return set(re.findall(r'title:\s*"([^"]+)"', block))


def parse_quote_blocks(text):
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
            i = joined.rfind('——')   # 用最后一个 —— 切分:引语正文可能含中文破折号——,出处在末尾
            out.append((joined[:i], joined[i:]))
        else:
            out.append((joined, ""))
    return out


def main():
    if not os.path.exists(CONTENT):
        print("FAIL"); print(f"  [ERR] 内容文件不存在: {CONTENT}"); return 1
    with open(CONTENT, encoding="utf-8") as f:
        text = f.read()
    corpus = load_corpus()
    corpus_titles = load_corpus_titles()
    topic_titles = load_topic_titles()
    errors = []

    # 1) ## 主题合法性
    for ln in text.splitlines():
        if ln.startswith("## "):
            t = ln[3:].strip()
            if t not in topic_titles:
                errors.append(f"非法主题分组「{t}」(必须是 site.ts TOPICS 的 title)")

    # 2) 逐字核验 + 出处存在性
    blocks = parse_quote_blocks(text)
    # 只对带《篇名》出处的 blockquote 做逐字核验;无出处的视为前言/说明,跳过
    quote_blocks = [(q, c) for q, c in blocks if q.strip() and "《" in c]
    for qtext, cite in quote_blocks:
        for frag in re.split(r'……|\.\.\\.|…', qtext):
            nf = normalize(frag)
            if len(nf) >= QUOTE_MINLEN and nf not in corpus:
                errors.append(f"引用未在语料中找到(疑似杜撰/错字/ASCII标点): 「{qtext[:40]}…」 片段「{frag[:40]}…」")
        # 出处:——《篇名》年份
        m = re.search(r'《(.+?)》', cite)
        if not m:
            errors.append(f"引用缺少《篇名》出处: 「{qtext[:40]}…」")
        else:
            nt = normalize(m.group(1))
            if len(nt) < 4 or not any(nt in ct or ct in nt for ct in corpus_titles):
                errors.append(f"出处篇名未匹配到任何语料文件: 《{m.group(1)}》")

    print("--- 不可为清单.md ---")
    print(f"引语数: {len(quote_blocks)}  主题数: {sum(1 for l in text.splitlines() if l.startswith('## '))}")
    if errors:
        print("FAIL")
        for e in errors:
            print(f"  [ERR] {e}")
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
