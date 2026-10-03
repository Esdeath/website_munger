import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from check_article import main, parse_quote_blocks  # noqa: E402


from unittest.mock import patch
import check_article
import check_stop_doing
from source_metadata import is_summary


class SummaryExclusionTests(unittest.TestCase):
    def test_only_frontmatter_marker_counts(self):
        for value in ['summary', '"summary"', "'summary'", 'summary # note']:
            self.assertTrue(is_summary('---\nsource_kind: ' + value + '\n---\n正文'))
        self.assertTrue(is_summary('\ufeff---\r\nsource_kind: summary\r\n---\r\n正文'))
        self.assertFalse(is_summary('# 正文\nsource_kind: summary'))
        self.assertFalse(is_summary('---\ntitle: old\n---\nsource_kind: summary'))
        self.assertFalse(is_summary('---\nsource_kind: original\n---\n正文'))
        self.assertFalse(is_summary('---\nsource_kind: translation\n---\n全文译文'))

    def test_both_quote_checkers_exclude_summary_text_and_titles(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / 'speech'
            folder.mkdir()
            (folder / 'original.md').write_text('# 原始标题\n保留逐字原文', encoding='utf8')
            (folder / 'translation.md').write_text('---\nsource_kind: translation\n---\n# 全文标题\n保留完整译文', encoding='utf8')
            (folder / 'summary.md').write_text('---\nsource_kind: summary\n---\n# 摘要标题\n不可作引文', encoding='utf8')
            for module in [check_article, check_stop_doing]:
                with patch.object(module, 'BASE', temp):
                    corpus = module.load_corpus()
                    self.assertIn('保留逐字原文', corpus)
                    self.assertIn('保留完整译文', corpus)
                    self.assertNotIn('不可作引文', corpus)
                    self.assertNotIn('摘要标题', corpus)
            with patch.object(check_stop_doing, 'BASE', temp):
                titles = check_stop_doing.load_corpus_titles()
                self.assertIn('原始标题', titles)
                self.assertNotIn('summary', titles)
                self.assertNotIn('摘要标题', titles)


class ParseQuoteBlocksTests(unittest.TestCase):
    def test_keeps_malformed_final_dash_line_in_quote_text(self):
        text = """> 「第一行引文
> ——未署名的引文续行」
"""

        self.assertEqual(
            parse_quote_blocks(text),
            [("「第一行引文 ——未署名的引文续行」", "")],
        )

    def test_preserves_multiline_dash_continuation_before_valid_citation(self):
        text = """> 「第一行引文
> ——引文中的续行
> 最后一行」
> ——《有效——来源》2020
"""

        self.assertEqual(
            parse_quote_blocks(text),
            [
                (
                    "「第一行引文 ——引文中的续行 最后一行」",
                    "——《有效——来源》2020",
                )
            ],
        )

    def test_preserves_internal_dash_in_quote_with_separate_citation_line(self):
        text = """> 「有条理的常识（或非常识）——也就是最基础的知识——是极其强大的工具。」
> ——《2002年 西科金融股东会讲话》
"""

        self.assertEqual(
            parse_quote_blocks(text),
            [
                (
                    "「有条理的常识（或非常识）——也就是最基础的知识——是极其强大的工具。」",
                    "——《2002年 西科金融股东会讲话》",
                )
            ],
        )

    def test_preserves_internal_dash_in_source_title_with_separate_citation_line(self):
        text = """> 「必须有人站出来说：我们不做这种事情。」
> ——《芒格主义——查理的即席谈话》
"""

        self.assertEqual(
            parse_quote_blocks(text),
            [
                (
                    "「必须有人站出来说：我们不做这种事情。」",
                    "——《芒格主义——查理的即席谈话》",
                )
            ],
        )

    def test_splits_legacy_same_line_quote_and_citation_at_title_marker(self):
        text = "> 「人们算得太多，思考得太少。」 ——《芒格主义——查理的即席谈话》\n"

        self.assertEqual(
            parse_quote_blocks(text),
            [
                (
                    "「人们算得太多，思考得太少。」",
                    "——《芒格主义——查理的即席谈话》",
                )
            ],
        )

    def test_rejects_incomplete_legacy_same_line_citation(self):
        text = "> 「人们算得太多，思考得太少。」 ——《未闭合的来源\n"

        self.assertEqual(
            parse_quote_blocks(text),
            [("「人们算得太多，思考得太少。」 ——《未闭合的来源", "")],
        )


class CitationGateIntegrationTests(unittest.TestCase):
    def test_malformed_citation_does_not_satisfy_citation_or_source_gate(self):
        quote = "「费马-帕斯卡的系统与世界运转的方式惊人地一致。」"
        blocks = []
        for index in range(11):
            source = ("来源一", "来源二", "来源三")[index % 3]
            blocks.append(f"> {quote}\n> ——《{source}》")
        blocks.append(f"> {quote}\n> ——未署名的引文续行」")
        article = """---
title: 引文测试
keyword: 引文测试
category: 思维模型讲义
quote_count: 12
---

## 反过来想

## 跨学科模型

{blocks}

## 出处索引
""".format(blocks="\n\n".join(blocks))

        with tempfile.NamedTemporaryFile("w", suffix=".md", encoding="utf-8") as handle:
            handle.write(article)
            handle.flush()
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                result = main(handle.name)

        self.assertEqual(result, 1)
        self.assertIn("不同来源数: 3", output.getvalue())
        self.assertIn("有 1 条引用没有出处", output.getvalue())


if __name__ == "__main__":
    unittest.main()
