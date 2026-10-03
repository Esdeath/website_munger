"""Minimal metadata guard for quotation corpora (no optional YAML dependency)."""
import re


def is_summary(text):
    """Recognize the repository's scalar source_kind marker only in frontmatter."""
    match = re.match(r"\A\ufeff?---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)", text, re.S)
    if not match:
        return False
    return bool(re.search(
        r"(?m)^source_kind:[ \t]*(?:summary|\"summary\"|'summary')[ \t]*(?:#[^\r\n]*)?\r?$",
        match.group(1),
    ))
