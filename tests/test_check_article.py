import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from check_article import parse_quote_blocks  # noqa: E402


class ParseQuoteBlocksTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
