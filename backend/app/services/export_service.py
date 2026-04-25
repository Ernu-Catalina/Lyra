import io
import re
from typing import Literal
from bs4 import BeautifulSoup, NavigableString, Tag

# ── Unit helpers ───────────────────────────────────────────────────────────────

def _to_cm(value: float, unit: str) -> float:
    if unit == "mm": return value / 10
    if unit == "in": return value * 2.54
    return value  # already cm

def _to_pt(value: float, unit: str = "px") -> float:
    """Convert to points (1pt = 1.333px at 96dpi)."""
    if unit == "px": return value * 0.75
    if unit == "pt": return value
    if unit == "em": return value * 12  # assume 12pt base
    return value

def _parse_style(style_str: str) -> dict:
    result = {}
    for part in (style_str or "").split(";"):
        part = part.strip()
        if ":" in part:
            k, v = part.split(":", 1)
            result[k.strip().lower()] = v.strip()
    return result

def _parse_pt(value_str: str) -> float:
    """Parse a CSS size string and return pt value."""
    value_str = value_str.strip()
    try:
        if value_str.endswith("pt"):
            return float(value_str[:-2])
        if value_str.endswith("px"):
            return float(value_str[:-2]) * 0.75
        if value_str.endswith("em"):
            return float(value_str[:-2]) * 12
        if value_str.endswith("cm"):
            return float(value_str[:-2]) * 28.35
        if value_str.endswith("mm"):
            return float(value_str[:-2]) * 2.835
        if value_str.endswith("in"):
            return float(value_str[:-2]) * 72
        return float(value_str) * 0.75
    except (ValueError, AttributeError):
        return 12.0

def _parse_cm(value_str: str) -> float:
    """Parse a CSS size string and return cm value."""
    value_str = (value_str or "").strip()
    try:
        if value_str.endswith("cm"): return float(value_str[:-2])
        if value_str.endswith("mm"): return float(value_str[:-2]) / 10
        if value_str.endswith("in"): return float(value_str[:-2]) * 2.54
        if value_str.endswith("px"): return float(value_str[:-2]) / 37.795
        if value_str.endswith("pt"): return float(value_str[:-2]) / 28.35
        if value_str.endswith("em"): return float(value_str[:-2]) * 0.423
        return 0.0
    except (ValueError, AttributeError):
        return 0.0

# ── Chapter title helpers ──────────────────────────────────────────────────────

def _format_chapter_title(order: int, title: str, settings: dict) -> str:
    fmt = settings.get("chapterTitleFormat", "none")
    if fmt == "none": return ""
    if fmt == "chapter-number": return f"Chapter {order}"
    if fmt == "chapter-number-title": return f"Chapter {order}: {title}"
    if fmt == "number-title": return f"{order}. {title}"
    if fmt == "title-only": return title
    return title

# ── DOCX export ────────────────────────────────────────────────────────────────

def build_docx(document_title: str, chapters: list, settings: dict) -> bytes:
    from docx import Document as DocxDocument
    from docx.shared import Pt, Cm, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    ALIGN_MAP = {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }

    doc = DocxDocument()

    # ── Page size & margins ──────────────────────────────────────────
    section = doc.sections[0]
    paper = settings.get("paperFormat", "A4")
    if paper == "A4":
        section.page_width  = int(Cm(21.0))
        section.page_height = int(Cm(29.7))
    elif paper == "Letter":
        section.page_width  = int(Cm(21.59))
        section.page_height = int(Cm(27.94))
    elif paper == "A5":
        section.page_width  = int(Cm(14.8))
        section.page_height = int(Cm(21.0))
    elif paper == "Legal":
        section.page_width  = int(Cm(21.59))
        section.page_height = int(Cm(35.56))
    elif paper == "Custom":
        pw = settings.get("customWidth", 210)
        ph = settings.get("customHeight", 297)
        section.page_width  = int(Cm(pw / 10))
        section.page_height = int(Cm(ph / 10))

    unit = settings.get("marginUnit", "cm")
    section.top_margin    = Cm(_to_cm(settings.get("marginTop",    2.5), unit))
    section.bottom_margin = Cm(_to_cm(settings.get("marginBottom", 2.5), unit))
    section.left_margin   = Cm(_to_cm(settings.get("marginLeft",   2.5), unit))
    section.right_margin  = Cm(_to_cm(settings.get("marginRight",  2.5), unit))

    default_font_name = settings.get("defaultFont", "Arial, sans-serif").split(",")[0].strip().strip("'\"")
    default_font_pt   = float(settings.get("defaultFontSize", 12))
    default_align     = ALIGN_MAP.get(settings.get("defaultAlignment", "left"), WD_ALIGN_PARAGRAPH.LEFT)
    default_indent_cm = _parse_cm(
        f"{settings.get('defaultFirstLineIndent', 0)}{settings.get('defaultFirstLineIndentUnit', 'cm')}"
    )

    def _set_paragraph_spacing(para, line_height: float):
        """Set line spacing on a paragraph via XML."""
        pPr = para._p.get_or_add_pPr()
        spacing = OxmlElement("w:spacing")
        spacing.set(qn("w:line"), str(int(line_height * 240)))
        spacing.set(qn("w:lineRule"), "auto")
        pPr.append(spacing)

    def _apply_run_formatting(run, styles: dict, is_heading: bool = False, heading_pt: float = None):
        """Apply inline CSS styles to a docx Run."""
        fs_str = styles.get("font-size", "")
        if fs_str:
            run.font.size = Pt(_parse_pt(fs_str))
        elif heading_pt:
            run.font.size = Pt(heading_pt)
        else:
            run.font.size = Pt(default_font_pt)

        ff = styles.get("font-family", "")
        run.font.name = ff.split(",")[0].strip().strip("'\"") if ff else default_font_name

        fw = styles.get("font-weight", "")
        run.font.bold = fw in ("bold", "700", "800", "900") or is_heading

        fi = styles.get("font-style", "")
        run.font.italic = fi == "italic"

        td = styles.get("text-decoration", "")
        run.font.underline = "underline" in td
        run.font.strike    = "line-through" in td

    def _process_element(para, element, inherited_styles: dict = None, is_heading=False, heading_pt=None):
        """Recursively process a BeautifulSoup element and add runs to para."""
        inherited_styles = inherited_styles or {}

        if isinstance(element, NavigableString):
            text = str(element)
            if text:
                run = para.add_run(text)
                _apply_run_formatting(run, inherited_styles, is_heading, heading_pt)
            return

        tag = element.name or ""
        el_styles = dict(inherited_styles)
        el_styles.update(_parse_style(element.get("style", "")))

        # Handle bold/italic tags
        if tag in ("strong", "b"): el_styles["font-weight"] = "bold"
        if tag in ("em", "i"):     el_styles["font-style"]  = "italic"
        if tag in ("u",):          el_styles["text-decoration"] = "underline"
        if tag in ("s", "del"):    el_styles["text-decoration"] = "line-through"

        if tag == "br":
            run = para.add_run()
            run.add_break()
            return

        for child in element.children:
            _process_element(para, child, el_styles, is_heading, heading_pt)

    def _add_block(soup_el, first_block: bool = False):
        """Convert a block-level BeautifulSoup element to a docx paragraph."""
        tag = soup_el.name or "p"
        block_styles = _parse_style(soup_el.get("style", ""))

        # Heading detection
        heading_pt_map = {"h1": 28.0, "h2": 22.0, "h3": 18.0, "h4": 16.0}
        is_heading = tag in heading_pt_map
        heading_pt = heading_pt_map.get(tag)

        para = doc.add_paragraph()

        # Alignment
        align_str = block_styles.get("text-align", settings.get("defaultAlignment", "left"))
        para.alignment = ALIGN_MAP.get(align_str, default_align)

        # First-line indent
        ti_str = block_styles.get("text-indent", "")
        if ti_str and "var(--default-first-line-indent" not in ti_str:
            ti_cm = _parse_cm(ti_str)
            if ti_cm:
                para.paragraph_format.first_line_indent = Cm(ti_cm)
        elif default_indent_cm and not first_block:
            para.paragraph_format.first_line_indent = Cm(default_indent_cm)

        # Line height
        lh_str = block_styles.get("line-height", "")
        try:
            lh = float(lh_str) if lh_str else float(settings.get("defaultLineHeight", 1.15))
            _set_paragraph_spacing(para, lh)
        except ValueError:
            _set_paragraph_spacing(para, 1.15)

        # Process inline content
        for child in soup_el.children:
            _process_element(para, child, {}, is_heading, heading_pt)

        return para

    # ── Document title ──────────────────────────────────────────────
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_para.add_run(document_title)
    title_run.font.size = Pt(24)
    title_run.font.bold = True
    title_run.font.name = default_font_name
    doc.add_paragraph()  # blank line after title

    # ── Chapters ────────────────────────────────────────────────────
    for ch_idx, chapter in enumerate(chapters):
        ch_title_text = _format_chapter_title(
            chapter.get("order", ch_idx) + 1,
            chapter.get("title", ""),
            settings
        )

        if ch_title_text:
            title_style = settings.get("chapterTitleStyle", "bold")
            title_pt    = float(settings.get("chapterTitleSize", 16))
            title_align = ALIGN_MAP.get(settings.get("chapterTitleAlignment", "center"), WD_ALIGN_PARAGRAPH.CENTER)

            ct_para = doc.add_paragraph()
            ct_para.alignment = title_align
            ct_run = ct_para.add_run(ch_title_text)
            ct_run.font.size  = Pt(title_pt)
            ct_run.font.bold  = "bold" in title_style
            ct_run.font.italic = "italic" in title_style
            ct_run.font.name  = default_font_name

            blank_lines = int(settings.get("blankLinesAfterChapter", 2))
            for _ in range(blank_lines):
                doc.add_paragraph()

        # ── Scenes ────────────────────────────────────────────────
        for scene in chapter.get("scenes", []):
            content = scene.get("content", "")
            if not content:
                continue

            # Strip spacer divs before parsing
            content = re.sub(r'<div[^>]*data-type="page-break-spacer"[^>]*>.*?</div>', "", content, flags=re.DOTALL)

            soup = BeautifulSoup(content, "html.parser")
            block_tags = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "div"}
            
            blocks = [el for el in soup.children if isinstance(el, Tag) and el.name in block_tags]
            if not blocks:
                # Wrap bare text in a paragraph
                if soup.get_text().strip():
                    para = doc.add_paragraph()
                    para.alignment = default_align
                    para.add_run(soup.get_text())
            else:
                for i, block in enumerate(blocks):
                    _add_block(block, first_block=(i == 0 and ch_idx == 0))

        # Page break between chapters
        if settings.get("pageBreakAfterChapter", True) and ch_idx < len(chapters) - 1:
            doc.add_page_break()

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── PDF export ─────────────────────────────────────────────────────────────────
def build_pdf(document_title: str, chapters: list, settings: dict) -> bytes:
    from reportlab.lib.pagesizes import A4, LETTER, A5, LEGAL
    from reportlab.lib.units import cm, inch, mm
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak
    )
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from io import BytesIO
    import html as html_lib

    buf = BytesIO()

    # ── Page size ──────────────────────────────────────────────────
    paper = settings.get("paperFormat", "A4")
    if paper == "Letter":
        pagesize = LETTER
    elif paper == "A5":
        pagesize = A5
    elif paper == "Legal":
        pagesize = LEGAL
    elif paper == "Custom":
        pw = settings.get("customWidth", 210)
        ph = settings.get("customHeight", 297)
        pagesize = (pw * mm, ph * mm)
    else:
        pagesize = A4

    # ── Margins ────────────────────────────────────────────────────
    unit_str = settings.get("marginUnit", "cm")
    def to_points(val: float) -> float:
        if unit_str == "mm": return val * mm
        if unit_str == "in": return val * inch
        return val * cm

    margin_top    = to_points(settings.get("marginTop",    2.5))
    margin_bottom = to_points(settings.get("marginBottom", 2.5))
    margin_left   = to_points(settings.get("marginLeft",   2.5))
    margin_right  = to_points(settings.get("marginRight",  2.5))

    doc = SimpleDocTemplate(
        buf,
        pagesize=pagesize,
        topMargin=margin_top,
        bottomMargin=margin_bottom,
        leftMargin=margin_left,
        rightMargin=margin_right,
    )

    # ── Alignment ──────────────────────────────────────────────────
    ALIGN_MAP = {
        "left": TA_LEFT,
        "center": TA_CENTER,
        "right": TA_RIGHT,
        "justify": TA_JUSTIFY,
    }
    default_align    = ALIGN_MAP.get(settings.get("defaultAlignment", "left"), TA_LEFT)
    default_font_pt  = float(settings.get("defaultFontSize", 12))
    default_lh       = float(settings.get("defaultLineHeight", 1.15))
    default_indent   = _parse_cm(
        f"{settings.get('defaultFirstLineIndent', 0)}"
        f"{settings.get('defaultFirstLineIndentUnit', 'cm')}"
    ) * cm

    # ── Font name (reportlab uses Helvetica/Times-Roman/Courier) ──
    raw_font = settings.get("defaultFont", "Arial, sans-serif").split(",")[0].strip().strip("'\"").lower()
    if "times" in raw_font or "georgia" in raw_font or "serif" in raw_font:
        rl_font      = "Times-Roman"
        rl_font_bold = "Times-Bold"
        rl_font_it   = "Times-Italic"
        rl_font_bi   = "Times-BoldItalic"
    elif "courier" in raw_font or "mono" in raw_font:
        rl_font      = "Courier"
        rl_font_bold = "Courier-Bold"
        rl_font_it   = "Courier-Oblique"
        rl_font_bi   = "Courier-BoldOblique"
    else:
        rl_font      = "Helvetica"
        rl_font_bold = "Helvetica-Bold"
        rl_font_it   = "Helvetica-Oblique"
        rl_font_bi   = "Helvetica-BoldOblique"

    # ── Base paragraph style ───────────────────────────────────────
    base_style = ParagraphStyle(
        "base",
        fontName=rl_font,
        fontSize=default_font_pt,
        leading=default_font_pt * default_lh * 1.2,
        alignment=default_align,
        firstLineIndent=default_indent,
        spaceAfter=0,
        spaceBefore=0,
    )

    def _make_style(name, **kwargs) -> ParagraphStyle:
        s = ParagraphStyle(name, parent=base_style)
        for k, v in kwargs.items():
            setattr(s, k, v)
        return s

    # ── HTML → ReportLab XML converter ────────────────────────────
    # ReportLab's Paragraph accepts a limited subset of HTML-like tags.
    # We convert our stored HTML into that subset.

    def _html_to_rl(html_content: str, style: ParagraphStyle) -> list:
        """
        Parse HTML content and return a list of ReportLab flowables.
        Handles: p, h1-h4, br, strong, b, em, i, u, s, span (with inline styles).
        """
        # Strip spacer divs
        html_content = re.sub(
            r'<div[^>]*data-type="page-break-spacer"[^>]*>.*?</div>',
            "", html_content, flags=re.DOTALL
        )

        soup = BeautifulSoup(html_content, "html.parser")
        flowables = []

        heading_sizes = {"h1": 28, "h2": 22, "h3": 18, "h4": 16}

        def _node_to_rl_xml(node) -> str:
            """Convert a soup node to ReportLab-compatible XML string."""
            if isinstance(node, NavigableString):
                return html_lib.escape(str(node))

            tag = node.name or ""
            inner = "".join(_node_to_rl_xml(c) for c in node.children)

            if tag in ("strong", "b"):
                return f"<b>{inner}</b>"
            if tag in ("em", "i"):
                return f"<i>{inner}</i>"
            if tag == "u":
                return f"<u>{inner}</u>"
            if tag in ("s", "del"):
                return f"<strike>{inner}</strike>"
            if tag == "br":
                return "<br/>"
            if tag == "span":
                st = _parse_style(node.get("style", ""))
                parts = []
                fs = st.get("font-size", "")
                ff = st.get("font-family", "")
                fw = st.get("font-weight", "")
                fi = st.get("font-style", "")

                if fs:
                    try:
                        parts.append(f'size="{int(_parse_pt(fs))}"')
                    except Exception:
                        pass
                if ff:
                    fname = ff.split(",")[0].strip().strip("'\"").lower()
                    if "times" in fname or "georgia" in fname:
                        parts.append(f'face="Times-Roman"')
                    elif "courier" in fname or "mono" in fname:
                        parts.append(f'face="Courier"')
                    else:
                        parts.append(f'face="Helvetica"')

                wrapped = inner
                if fw in ("bold", "700", "800", "900"):
                    wrapped = f"<b>{wrapped}</b>"
                if fi == "italic":
                    wrapped = f"<i>{wrapped}</i>"

                if parts:
                    attrs = " ".join(parts)
                    return f'<font {attrs}>{wrapped}</font>'
                return wrapped

            # For block-level tags inside inline context, just return inner
            return inner

        block_tags = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"}

        for el in soup.children:
            if isinstance(el, NavigableString):
                text = str(el).strip()
                if text:
                    flowables.append(Paragraph(html_lib.escape(text), style))
                continue

            if not isinstance(el, Tag):
                continue

            tag = el.name or ""

            if tag in heading_sizes:
                hpt = heading_sizes[tag]
                h_style = _make_style(
                    f"h{tag}",
                    fontName=rl_font_bold,
                    fontSize=hpt,
                    leading=hpt * 1.3,
                    alignment=TA_LEFT,
                    firstLineIndent=0,
                    spaceBefore=hpt * 0.5,
                    spaceAfter=hpt * 0.3,
                )
                xml = "".join(_node_to_rl_xml(c) for c in el.children)
                flowables.append(Paragraph(xml or " ", h_style))
                continue

            if tag in block_tags or tag == "div":
                # Parse per-block styles
                st = _parse_style(el.get("style", ""))
                bl_align = ALIGN_MAP.get(st.get("text-align", ""), default_align)
                ti_str = st.get("text-indent", "")
                if ti_str and "var(" not in ti_str:
                    bl_indent = _parse_cm(ti_str) * cm
                else:
                    bl_indent = default_indent

                lh_str = st.get("line-height", "")
                try:
                    bl_lh = float(lh_str) if lh_str else default_lh
                except ValueError:
                    bl_lh = default_lh

                fs_str = st.get("font-size", "")
                bl_pt = _parse_pt(fs_str) if fs_str else default_font_pt

                p_style = _make_style(
                    f"p_{id(el)}",
                    alignment=bl_align,
                    firstLineIndent=bl_indent,
                    fontSize=bl_pt,
                    leading=bl_pt * bl_lh * 1.2,
                )

                xml = "".join(_node_to_rl_xml(c) for c in el.children)
                if xml.strip():
                    flowables.append(Paragraph(xml, p_style))
                else:
                    flowables.append(Spacer(1, default_font_pt))
                continue

        return flowables

    # ── Build story ────────────────────────────────────────────────
    story = []

    # Document title
    title_style = _make_style(
        "doc_title",
        fontName=rl_font_bold,
        fontSize=24,
        leading=30,
        alignment=TA_CENTER,
        firstLineIndent=0,
        spaceAfter=24,
    )
    story.append(Paragraph(html_lib.escape(document_title), title_style))
    story.append(Spacer(1, 12))

    ch_title_style_raw = settings.get("chapterTitleStyle", "bold")
    ch_title_pt        = float(settings.get("chapterTitleSize", 16))
    ch_title_align     = ALIGN_MAP.get(settings.get("chapterTitleAlignment", "center"), TA_CENTER)
    ch_title_fn        = rl_font_bold if "bold" in ch_title_style_raw else rl_font
    if "italic" in ch_title_style_raw:
        ch_title_fn = rl_font_bi if "bold" in ch_title_style_raw else rl_font_it

    ch_title_style = _make_style(
        "ch_title",
        fontName=ch_title_fn,
        fontSize=ch_title_pt,
        leading=ch_title_pt * 1.4,
        alignment=ch_title_align,
        firstLineIndent=0,
        spaceBefore=ch_title_pt,
        spaceAfter=ch_title_pt * 0.5,
    )

    for ch_idx, chapter in enumerate(chapters):
        ch_title_text = _format_chapter_title(
            chapter.get("order", ch_idx) + 1,
            chapter.get("title", ""),
            settings
        )

        if ch_title_text:
            story.append(Paragraph(html_lib.escape(ch_title_text), ch_title_style))
            blank_lines = int(settings.get("blankLinesAfterChapter", 2))
            for _ in range(blank_lines):
                story.append(Spacer(1, default_font_pt * default_lh))

        for scene in chapter.get("scenes", []):
            content = scene.get("content", "")
            if not content:
                continue
            flowables = _html_to_rl(content, base_style)
            story.extend(flowables)

        if settings.get("pageBreakAfterChapter", True) and ch_idx < len(chapters) - 1:
            story.append(PageBreak())

    doc.build(story)
    return buf.getvalue()