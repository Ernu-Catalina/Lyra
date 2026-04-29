import re
from html import unescape
from typing import Tuple

PAPER_SIZES_MM = {
    "A4":     (210.0, 297.0),
    "Letter": (215.9, 279.4),
    "A5":     (148.0, 210.0),
    "Legal":  (215.9, 355.6),
}

UNIT_TO_MM = {"mm": 1.0, "cm": 10.0, "in": 25.4}


def count_words(html: str) -> int:
    """Convert HTML to plain text and count words."""
    if not html:
        return 0
    text = re.sub(r"<[^>]+>", " ", html)
    text = unescape(text)
    words = re.findall(r"\b\w+\b", text)
    return len(words)


def sum_scene_wordcounts(scenes: list) -> int:
    return sum(scene.get("wordcount", 0) for scene in scenes)


def _html_to_plain(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def count_characters(html: str) -> Tuple[int, int]:
    """Return (chars_with_spaces, chars_without_spaces) for HTML content."""
    text = _html_to_plain(html)
    with_spaces = len(text)
    without_spaces = len(re.sub(r"\s", "", text))
    return with_spaces, without_spaces


def estimate_pages(settings: dict, word_count: int, chapter_count: int = 0) -> float:
    """
    Estimate page count from word count and document settings.

    Font size is treated as points (pt), matching how the PDF/DOCX export
    uses defaultFontSize directly. Leading uses the ReportLab formula:
    leading = font_size_pt × line_height × 1.2.
    """
    if word_count <= 0:
        return 0.0

    # All dimensions in typographic points (1 pt = 1/72 inch)
    PT_PER_MM = 2.83465
    PT_PER_CM = 28.3465
    PT_PER_IN = 72.0

    margin_unit  = settings.get("marginUnit", "cm")
    margin_scale = {"mm": PT_PER_MM, "in": PT_PER_IN}.get(margin_unit, PT_PER_CM)

    PAPER_SIZES_PT = {
        "A4":     (595.3, 841.9),
        "Letter": (612.0, 792.0),
        "A5":     (419.5, 595.3),
        "Legal":  (612.0, 1008.0),
    }

    paper_format = settings.get("paperFormat", "A4")
    if paper_format == "Custom":
        paper_w_pt = float(settings.get("customWidth",  210)) * PT_PER_MM
        paper_h_pt = float(settings.get("customHeight", 297)) * PT_PER_MM
    else:
        paper_w_pt, paper_h_pt = PAPER_SIZES_PT.get(paper_format, (595.3, 841.9))

    mt = float(settings.get("marginTop",    2.5)) * margin_scale
    mb = float(settings.get("marginBottom", 2.5)) * margin_scale
    ml = float(settings.get("marginLeft",   2.5)) * margin_scale
    mr = float(settings.get("marginRight",  2.5)) * margin_scale

    usable_w_pt = max(paper_w_pt - ml - mr, 1.0)
    usable_h_pt = max(paper_h_pt - mt - mb, 1.0)

    # defaultFontSize is stored in pt (matches PDF/DOCX export usage)
    font_size_pt = max(float(settings.get("defaultFontSize", 12)), 1.0)
    line_height  = max(float(settings.get("defaultLineHeight", 1.15)), 0.5)

    # PDF export (ReportLab) uses: leading = font_size_pt × line_height × 1.2
    leading_pt = font_size_pt * line_height * 1.2

    # Average char width for proportional fonts (Helvetica/Arial) ≈ 0.5 × font_size_pt
    # Average English word length including trailing space ≈ 5.5 chars
    avg_char_width_pt = font_size_pt * 0.5
    chars_per_line    = usable_w_pt / avg_char_width_pt
    words_per_line    = chars_per_line / 5.5

    lines_per_page = usable_h_pt / leading_pt
    words_per_page = max(words_per_line * lines_per_page, 1.0)

    text_pages = word_count / words_per_page

    # Each chapter page break wastes on average ~0.4 of a page
    if settings.get("pageBreakAfterChapter", True) and chapter_count > 1:
        text_pages += (chapter_count - 1) * 0.4

    return round(text_pages, 1)
