#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)
from reportlab.platypus.tableofcontents import TableOfContents


PAGE_WIDTH = 160 * mm
PAGE_HEIGHT = 240 * mm
LEFT_MARGIN = 19 * mm
RIGHT_MARGIN = 17 * mm
TOP_MARGIN = 18 * mm
BOTTOM_MARGIN = 19 * mm

INK = colors.HexColor("#17201d")
MUTED = colors.HexColor("#61706a")
GREEN = colors.HexColor("#174c3d")
GREEN_DARK = colors.HexColor("#0d2d25")
RED = colors.HexColor("#a63b32")
RULE = colors.HexColor("#cbd5d0")
PAPER = colors.HexColor("#ffffff")


def register_fonts() -> tuple[str, str]:
    serif_candidates = [
        Path("/System/Library/Fonts/Supplemental/Songti.ttc"),
        Path("/System/Library/Fonts/STHeiti Light.ttc"),
    ]
    sans_candidates = [
        Path("/System/Library/Fonts/STHeiti Medium.ttc"),
        Path("/System/Library/Fonts/STHeiti Light.ttc"),
    ]
    serif_path = next((path for path in serif_candidates if path.exists()), None)
    sans_path = next((path for path in sans_candidates if path.exists()), serif_path)
    if serif_path is None or sans_path is None:
        raise RuntimeError("A Chinese TrueType/OpenType font was not found.")
    serif_subfont = 6 if serif_path.name == "Songti.ttc" else 0
    pdfmetrics.registerFont(TTFont("BookSerif", str(serif_path), subfontIndex=serif_subfont))
    pdfmetrics.registerFont(TTFont("BookSans", str(sans_path), subfontIndex=0))
    return "BookSerif", "BookSans"


def paragraph_text(value: str) -> str:
    return escape(value).replace("\n", "<br/>")


class BookDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, cover_path: Path, serif: str, sans: str, subtitle: str, edition: str, **kwargs):
        super().__init__(filename, **kwargs)
        self.cover_path = cover_path
        self.serif = serif
        self.sans = sans
        self.subtitle = subtitle
        self.edition = edition
        self._bookmark_index = 0
        cover_frame = Frame(0, 0, PAGE_WIDTH, PAGE_HEIGHT, id="cover", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        body_frame = Frame(
            LEFT_MARGIN,
            BOTTOM_MARGIN,
            PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN,
            PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN,
            id="body",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates([
            PageTemplate(id="Cover", frames=[cover_frame], onPage=self.draw_cover),
            PageTemplate(id="Body", frames=[body_frame], onPage=self.draw_body_chrome),
        ])

    def beforeDocument(self):
        self._bookmark_index = 0
        return super().beforeDocument()

    def draw_cover(self, canvas, doc):
        canvas.saveState()
        canvas.drawImage(ImageReader(str(self.cover_path)), 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT, mask="auto")
        canvas.setFillColor(colors.Color(0, 0, 0, alpha=0.08))
        canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        canvas.setFillColor(RED)
        canvas.rect(17 * mm, 141 * mm, 3 * mm, 69 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont(self.sans, 31)
        canvas.drawString(25 * mm, 184 * mm, "芒格")
        canvas.drawString(25 * mm, 168 * mm, "问答录")
        canvas.setFont(self.sans, 10.5)
        canvas.drawString(25 * mm, 153 * mm, self.subtitle)
        canvas.setFont(self.sans, 7.5)
        canvas.drawString(25 * mm, 36 * mm, self.edition)
        canvas.drawString(25 * mm, 31 * mm, "据 website_munger 中文语料整理")
        canvas.restoreState()

    def draw_body_chrome(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.45)
        canvas.line(LEFT_MARGIN, PAGE_HEIGHT - 12.5 * mm, PAGE_WIDTH - RIGHT_MARGIN, PAGE_HEIGHT - 12.5 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont(self.sans, 7)
        canvas.drawString(LEFT_MARGIN, PAGE_HEIGHT - 10 * mm, "芒格问答录")
        display_page = max(1, canvas.getPageNumber() - 1)
        canvas.drawRightString(PAGE_WIDTH - RIGHT_MARGIN, 10.5 * mm, str(display_page))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "ChapterTitle":
            text = flowable.getPlainText()
            key = f"chapter-{self._bookmark_index}"
            self._bookmark_index += 1
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0, closed=False)
            self.notify("TOCEntry", (0, text, self.page - 1, key))


def make_styles(serif: str, sans: str):
    styles = getSampleStyleSheet()
    return {
        "half_title": ParagraphStyle(
            "HalfTitle", parent=styles["Title"], fontName=sans, fontSize=27, leading=34,
            textColor=GREEN_DARK, alignment=TA_LEFT, spaceAfter=11 * mm, wordWrap="CJK",
        ),
        "subtitle": ParagraphStyle(
            "SubtitleCN", parent=styles["Normal"], fontName=sans, fontSize=11.5, leading=19,
            textColor=RED, spaceAfter=7 * mm, wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "BodyCN", parent=styles["BodyText"], fontName=serif, fontSize=10.2, leading=18,
            textColor=INK, firstLineIndent=20.4, spaceAfter=4.5 * mm, wordWrap="CJK",
            allowWidows=0, allowOrphans=0,
        ),
        "body_no_indent": ParagraphStyle(
            "BodyNoIndent", parent=styles["BodyText"], fontName=serif, fontSize=10.2, leading=18,
            textColor=INK, spaceAfter=4.5 * mm, wordWrap="CJK",
        ),
        "note": ParagraphStyle(
            "NoteCN", parent=styles["BodyText"], fontName=serif, fontSize=9, leading=15.5,
            textColor=colors.HexColor("#33403b"), leftIndent=5 * mm, borderColor=RED,
            borderWidth=0, borderPadding=(0, 0, 0, 5 * mm), spaceBefore=3 * mm,
            spaceAfter=5 * mm, wordWrap="CJK",
        ),
        "small_heading": ParagraphStyle(
            "SmallHeading", parent=styles["Heading3"], fontName=sans, fontSize=10.5, leading=16,
            textColor=GREEN_DARK, spaceBefore=5 * mm, spaceAfter=2.5 * mm, wordWrap="CJK",
        ),
        "chapter": ParagraphStyle(
            "ChapterTitle", parent=styles["Heading1"], fontName=sans, fontSize=21.5, leading=28.5,
            textColor=GREEN_DARK, spaceAfter=3 * mm, wordWrap="CJK", keepWithNext=True,
        ),
        "chapter_kicker": ParagraphStyle(
            "ChapterKicker", parent=styles["Normal"], fontName=sans, fontSize=8.5, leading=14,
            textColor=RED, spaceAfter=4 * mm, wordWrap="CJK", keepWithNext=True,
        ),
        "chapter_desc": ParagraphStyle(
            "ChapterDesc", parent=styles["Normal"], fontName=serif, fontSize=10.5, leading=17,
            textColor=MUTED, spaceAfter=9 * mm, wordWrap="CJK",
        ),
        "section": ParagraphStyle(
            "SectionTitle", parent=styles["Heading2"], fontName=sans, fontSize=14, leading=21,
            textColor=GREEN_DARK, spaceBefore=9 * mm, spaceAfter=2 * mm,
            wordWrap="CJK", keepWithNext=True,
        ),
        "section_desc": ParagraphStyle(
            "SectionDesc", parent=styles["Normal"], fontName=sans, fontSize=7.8, leading=13,
            textColor=MUTED, spaceAfter=4 * mm, wordWrap="CJK", keepWithNext=True,
        ),
        "question": ParagraphStyle(
            "Question", parent=styles["Heading3"], fontName=sans, fontSize=10.2, leading=17,
            textColor=INK, spaceBefore=5.5 * mm, spaceAfter=3.5 * mm, wordWrap="CJK", keepWithNext=True,
        ),
        "answer_label": ParagraphStyle(
            "AnswerLabel", parent=styles["Normal"], fontName=sans, fontSize=7.6, leading=12,
            textColor=RED, spaceAfter=1.5 * mm, wordWrap="CJK", keepWithNext=True,
        ),
        "answer": ParagraphStyle(
            "Answer", parent=styles["BodyText"], fontName=serif, fontSize=10.2, leading=18,
            textColor=INK, firstLineIndent=20.4, spaceAfter=3 * mm, wordWrap="CJK",
            allowWidows=0, allowOrphans=0,
        ),
        "answer_last": ParagraphStyle(
            "AnswerLast", parent=styles["BodyText"], fontName=serif, fontSize=10.2, leading=18,
            textColor=INK, firstLineIndent=20.4, spaceAfter=3 * mm, wordWrap="CJK",
            allowWidows=0, allowOrphans=0, keepWithNext=True,
        ),
        "source": ParagraphStyle(
            "Source", parent=styles["Normal"], fontName=sans, fontSize=6.5, leading=10.5,
            textColor=MUTED, spaceBefore=1.5 * mm, spaceAfter=2.5 * mm, wordWrap="CJK",
        ),
        "toc_title": ParagraphStyle(
            "TOCTitle", parent=styles["Heading1"], fontName=sans, fontSize=22, leading=29,
            textColor=GREEN_DARK, spaceAfter=7 * mm, wordWrap="CJK",
        ),
        "source_item": ParagraphStyle(
            "SourceItem", parent=styles["BodyText"], fontName=sans, fontSize=7.7, leading=12.5,
            textColor=INK, spaceAfter=3.5 * mm, wordWrap="CJK",
        ),
        "colophon": ParagraphStyle(
            "Colophon", parent=styles["Normal"], fontName=serif, fontSize=8, leading=14,
            textColor=MUTED, spaceBefore=8 * mm, wordWrap="CJK",
        ),
    }


def add_answer(story: list, answer: str, style, last_style):
    paragraphs = [part.strip() for part in answer.split("\n\n") if part.strip()]
    for index, paragraph in enumerate(paragraphs):
        paragraph_style = last_style if index == len(paragraphs) - 1 else style
        story.append(Paragraph(paragraph_text(paragraph), paragraph_style))


def build_story(book: dict, styles: dict) -> list:
    stats = book["stats"]
    metadata = book["metadata"]
    story = [NextPageTemplate("Body"), PageBreak()]

    story.extend([
        Spacer(1, 8 * mm),
        Paragraph("芒格问答录", styles["half_title"]),
        Paragraph(escape(metadata["subtitle"]), styles["subtitle"]),
        Paragraph(
            f'{stats["startYear"]}-{stats["endYear"]} · {stats["questionCount"]} 问 · {stats["sourceCount"]} 篇来源',
            styles["body_no_indent"],
        ),
        Spacer(1, 7 * mm),
        Paragraph("给读者的话", styles["small_heading"]),
        Paragraph(
            f'这一版从 {stats["selectedFromCount"]} 组可用问答中精选 {stats["questionCount"]} 组，'
            f'按普通读者理解价值投资的顺序，重编为 {len(book["chapters"])} 章、'
            f'{sum(len(chapter["sections"]) for chapter in book["chapters"])} 个递进小节。'
            '重复观点、过时时评、公司琐事和现场闲话均不收入正文。',
            styles["body"],
        ),
        Paragraph("七句编者提要", styles["small_heading"]),
    ])
    for index, item in enumerate(book["guide"], start=1):
        story.append(Paragraph(f'{index}. {escape(item)}', styles["body_no_indent"]))
    story.extend([
        Paragraph(
            "<b>编辑边界：</b>回答保留本仓库中文语料的原句。少数长回答只删去旁支故事、重复铺陈或其他说话人的内容，并标明“本版节选”。冗长提问删去寒暄与时事背景，个别访谈提示改成简短问句。“原文”指本仓库保存的中文翻译或整理文本。",
            styles["note"],
        ),
    ])

    story.extend([PageBreak(), Paragraph("目录", styles["toc_title"])])
    toc = TableOfContents()
    toc.levelStyles = [ParagraphStyle(
        "TOCLevel1", fontName=styles["body"].fontName, fontSize=10.2, leading=18,
        textColor=INK, leftIndent=0, firstLineIndent=0, spaceBefore=2.5 * mm,
    )]
    story.extend([toc, PageBreak()])

    for chapter_index, chapter in enumerate(book["chapters"]):
        if chapter_index > 0:
            story.append(PageBreak())
        story.append(Paragraph(f'{chapter["number"]}. {escape(chapter["title"])}', styles["chapter"]))
        story.append(Paragraph(escape(chapter["kicker"]), styles["chapter_kicker"]))
        story.append(Paragraph(escape(chapter["description"]), styles["chapter_desc"]))
        story.append(HRFlowable(width="100%", thickness=2.2, color=GREEN, spaceAfter=3 * mm))

        for section in chapter["sections"]:
            story.append(Paragraph(
                f'<font color="#a63b32" size="7.6">{chapter["number"]}.{section["number"]}</font>'
                f'&nbsp;&nbsp;{escape(section["title"])}',
                styles["section"],
            ))
            story.append(Paragraph(escape(section["description"]), styles["section_desc"]))

            for qa in section["items"]:
                question = paragraph_text(qa["question"])
                story.append(Paragraph(
                    f'<font color="#a63b32" size="7.6">问 {qa["number"]:03d}</font>&nbsp;&nbsp;{question}',
                    styles["question"],
                ))
                story.append(Paragraph("答", styles["answer_label"]))
                add_answer(story, qa["answer"], styles["answer"], styles["answer_last"])
                excerpted = " · 本版节选" if qa.get("answerExcerpted") else ""
                review = " · 含编者或译者提示" if qa.get("noteFlag") else ""
                story.append(Paragraph(
                    f'{escape(qa["sourceYear"])} · {escape(qa["sourceTitle"])} · 原文件第 {qa["questionLine"]} 行{excerpted}{review}',
                    styles["source"],
                ))
                story.append(HRFlowable(width="100%", thickness=0.35, color=RULE, spaceBefore=1 * mm))

    story.extend([PageBreak(), Paragraph("来源索引", styles["chapter"])])
    story.append(Paragraph(
        "行号以本版生成时的仓库文件为准。",
        styles["chapter_desc"],
    ))
    for source in book["sources"]:
        story.append(Paragraph(
            f'<b>{escape(source["year"])} · {escape(source["title"])}</b><br/>'
            f'{source["count"]} 问 · {escape(source["type"])}<br/>'
            f'{escape(source["path"])}',
            styles["source_item"],
        ))
    story.append(Paragraph(
        f'整理日期：{escape(metadata["buildDate"])}。封面为生成式编辑插画，不是历史照片。全书内容来自本地 website_munger 语料库。',
        styles["colophon"],
    ))
    return story


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: render-munger-qa-pdf.py BOOK_JSON COVER_PNG OUTPUT_PDF")
    book_path, cover_path, output_path = map(Path, sys.argv[1:])
    book = json.loads(book_path.read_text(encoding="utf-8"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    serif, sans = register_fonts()
    styles = make_styles(serif, sans)

    doc = BookDocTemplate(
        str(output_path),
        cover_path,
        serif,
        sans,
        subtitle=book["metadata"]["subtitle"],
        edition=book["metadata"]["edition"],
        pagesize=(PAGE_WIDTH, PAGE_HEIGHT),
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title=book["metadata"]["title"],
        author="查理·芒格",
        subject=book["metadata"]["subtitle"],
        keywords="查理·芒格, 投资, 思维模型, 股东会, 访谈",
        pageCompression=1,
    )
    doc.multiBuild(build_story(book, styles))
    print(f"PDF written: {output_path}")


if __name__ == "__main__":
    main()
