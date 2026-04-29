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


def estimate_pages(settings: dict, char_count_no_spaces: int) -> float:
    """
    Estimate page count from document settings and character count.
    Uses paper dimensions, margins, font size, and line height.
    """
    if char_count_no_spaces <= 0:
        return 0.0

    paper_format = settings.get("paperFormat", "A4")
    margin_unit = settings.get("marginUnit", "cm")
    unit_mm = UNIT_TO_MM.get(margin_unit, 10.0)

    if paper_format == "Custom":
        paper_w = float(settings.get("customWidth", 210))
        paper_h = float(settings.get("customHeight", 297))
    else:
        paper_w, paper_h = PAPER_SIZES_MM.get(paper_format, (210.0, 297.0))

    margin_top    = float(settings.get("marginTop",    2.5)) * unit_mm
    margin_bottom = float(settings.get("marginBottom", 2.5)) * unit_mm
    margin_left   = float(settings.get("marginLeft",   2.5)) * unit_mm
    margin_right  = float(settings.get("marginRight",  2.5)) * unit_mm

    usable_w = max(paper_w - margin_left - margin_right, 1.0)
    usable_h = max(paper_h - margin_top  - margin_bottom, 1.0)

    # px → mm: 1 px = 0.264583 mm
    font_size_mm   = float(settings.get("defaultFontSize", 12)) * 0.264583
    line_height_mm = max(font_size_mm * float(settings.get("defaultLineHeight", 1.5)), 0.1)

    # Average character width ≈ 0.5× font size for proportional fonts (Arial-like)
    avg_char_width_mm = max(font_size_mm * 0.5, 0.1)

    chars_per_line = usable_w / avg_char_width_mm
    lines_per_page = usable_h / line_height_mm
    chars_per_page = chars_per_line * lines_per_page

    if chars_per_page <= 0:
        return 0.0

    return round(char_count_no_spaces / chars_per_page, 1)
