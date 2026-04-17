"""
Test suite for export_service.py

Verifies DOCX and PDF generation with various configurations.
Ensures refactoring from WeasyPrint to ReportLab is functional.
"""

import pytest
from app.services.export_service import (
    build_pdf,
    build_docx,
    format_chapter_title,
    get_alignment,
)
from docx.enum.text import WD_ALIGN_PARAGRAPH


class TestExportService:
    """Test export service functionality."""

    @pytest.fixture
    def sample_chapters(self):
        """Sample chapters for testing."""
        return [
            {
                "order": 0,
                "title": "Introduction",
                "scenes": [
                    {
                        "content": "<p>This is the introduction paragraph.</p>"
                    },
                    {
                        "content": "<h2>Background</h2><p>Some background information.</p>"
                    },
                ],
            },
            {
                "order": 1,
                "title": "Main Content",
                "scenes": [
                    {
                        "content": "<h3>Section 1</h3><p>First section content.</p>"
                    },
                    {
                        "content": "<h3>Section 2</h3><p>Second section content.</p>"
                    },
                ],
            },
        ]

    @pytest.fixture
    def default_settings(self):
        """Default export settings."""
        return {
            "paperFormat": "A4",
            "marginTop": 2.5,
            "marginBottom": 2.5,
            "marginLeft": 2.5,
            "marginRight": 2.5,
            "marginUnit": "cm",
            "defaultFont": "Helvetica",
            "defaultFontSize": 12,
            "defaultAlignment": "left",
            "chapterTitleFormat": "chapter-number-title",
            "chapterTitleSize": 16,
            "chapterTitleAlignment": "center",
            "chapterTitleStyle": "bold",
            "blankLinesAfterChapter": 2,
            "pageBreakAfterChapter": False,
        }

    # DOCX Export Tests
    def test_build_docx_basic(self, sample_chapters, default_settings):
        """Test basic DOCX generation."""
        docx_bytes = build_docx(sample_chapters, default_settings)

        # DOCX files are ZIP archives
        assert docx_bytes.startswith(b"PK"), "DOCX should start with ZIP header 'PK'"
        assert len(docx_bytes) > 1000, "DOCX should have reasonable size"

    def test_build_docx_custom_page_size(self, sample_chapters, default_settings):
        """Test DOCX with custom page size."""
        default_settings["paperFormat"] = "Letter"
        docx_bytes = build_docx(sample_chapters, default_settings)

        assert docx_bytes.startswith(b"PK")
        assert len(docx_bytes) > 1000

    def test_build_docx_a5_page_size(self, sample_chapters, default_settings):
        """Test DOCX with A5 page size."""
        default_settings["paperFormat"] = "A5"
        docx_bytes = build_docx(sample_chapters, default_settings)

        assert docx_bytes.startswith(b"PK")
        assert len(docx_bytes) > 1000

    def test_build_docx_custom_margins(self, sample_chapters, default_settings):
        """Test DOCX with custom margins."""
        default_settings["marginTop"] = 3.0
        default_settings["marginLeft"] = 4.0
        default_settings["marginUnit"] = "cm"

        docx_bytes = build_docx(sample_chapters, default_settings)
        assert docx_bytes.startswith(b"PK")

    def test_build_docx_mm_margins(self, sample_chapters, default_settings):
        """Test DOCX with millimeter margins."""
        default_settings["marginUnit"] = "mm"
        default_settings["marginTop"] = 25
        default_settings["marginLeft"] = 25

        docx_bytes = build_docx(sample_chapters, default_settings)
        assert docx_bytes.startswith(b"PK")

    def test_build_docx_inch_margins(self, sample_chapters, default_settings):
        """Test DOCX with inch margins."""
        default_settings["marginUnit"] = "in"
        default_settings["marginTop"] = 1.0
        default_settings["marginLeft"] = 1.0

        docx_bytes = build_docx(sample_chapters, default_settings)
        assert docx_bytes.startswith(b"PK")

    def test_build_docx_page_break(self, sample_chapters, default_settings):
        """Test DOCX with page breaks after chapters."""
        default_settings["pageBreakAfterChapter"] = True
        docx_bytes = build_docx(sample_chapters, default_settings)

        assert docx_bytes.startswith(b"PK")
        # Size should be similar (page breaks are metadata)
        assert len(docx_bytes) > 1000

    def test_build_docx_no_chapter_titles(self, sample_chapters, default_settings):
        """Test DOCX with no chapter titles."""
        default_settings["chapterTitleFormat"] = "none"
        docx_bytes = build_docx(sample_chapters, default_settings)

        assert docx_bytes.startswith(b"PK")
        # Without titles, file should be somewhat smaller
        assert len(docx_bytes) > 500

    def test_build_docx_empty_chapters(self, default_settings):
        """Test DOCX generation with empty chapters list."""
        docx_bytes = build_docx([], default_settings)

        assert docx_bytes.startswith(b"PK")
        assert len(docx_bytes) > 500  # Still creates basic document structure

    # PDF Export Tests
    def test_build_pdf_basic(self, sample_chapters, default_settings):
        """Test basic PDF generation."""
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        # PDF files start with %PDF magic header
        assert pdf_bytes.startswith(b"%PDF"), "PDF should start with %PDF header"
        assert len(pdf_bytes) > 1000, "PDF should have reasonable size"

    def test_build_pdf_custom_page_size(self, sample_chapters, default_settings):
        """Test PDF with custom page size."""
        default_settings["paperFormat"] = "Letter"
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 1000

    def test_build_pdf_a5_page_size(self, sample_chapters, default_settings):
        """Test PDF with A5 page size."""
        default_settings["paperFormat"] = "A5"
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 1000

    def test_build_pdf_custom_dimensions(self, sample_chapters, default_settings):
        """Test PDF with custom page dimensions."""
        default_settings["paperFormat"] = "Custom"
        default_settings["customWidth"] = 180
        default_settings["customHeight"] = 250

        pdf_bytes = build_pdf(sample_chapters, default_settings)
        assert pdf_bytes.startswith(b"%PDF")

    def test_build_pdf_custom_margins(self, sample_chapters, default_settings):
        """Test PDF with custom margins."""
        default_settings["marginTop"] = 3.0
        default_settings["marginBottom"] = 3.0
        default_settings["marginLeft"] = 4.0
        default_settings["marginRight"] = 4.0

        pdf_bytes = build_pdf(sample_chapters, default_settings)
        assert pdf_bytes.startswith(b"%PDF")

    def test_build_pdf_mm_margins(self, sample_chapters, default_settings):
        """Test PDF with millimeter margins."""
        default_settings["marginUnit"] = "mm"
        default_settings["marginTop"] = 25

        pdf_bytes = build_pdf(sample_chapters, default_settings)
        assert pdf_bytes.startswith(b"%PDF")

    def test_build_pdf_inch_margins(self, sample_chapters, default_settings):
        """Test PDF with inch margins."""
        default_settings["marginUnit"] = "in"
        default_settings["marginTop"] = 1.0

        pdf_bytes = build_pdf(sample_chapters, default_settings)
        assert pdf_bytes.startswith(b"%PDF")

    def test_build_pdf_page_break(self, sample_chapters, default_settings):
        """Test PDF with page breaks after chapters."""
        default_settings["pageBreakAfterChapter"] = True
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")
        # Page break should increase size slightly
        assert len(pdf_bytes) > 1000

    def test_build_pdf_no_chapter_titles(self, sample_chapters, default_settings):
        """Test PDF with no chapter titles."""
        default_settings["chapterTitleFormat"] = "none"
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 1000

    def test_build_pdf_empty_chapters(self, default_settings):
        """Test PDF generation with empty chapters list."""
        pdf_bytes = build_pdf([], default_settings)

        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 1000

    def test_build_pdf_custom_font(self, sample_chapters, default_settings):
        """Test PDF with custom font."""
        default_settings["defaultFont"] = "Times-Roman"
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 1000

    def test_build_pdf_custom_font_size(self, sample_chapters, default_settings):
        """Test PDF with custom font size."""
        default_settings["defaultFontSize"] = 14
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 1000

    def test_build_pdf_alignment_center(self, sample_chapters, default_settings):
        """Test PDF with center alignment."""
        default_settings["defaultAlignment"] = "center"
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")

    def test_build_pdf_alignment_right(self, sample_chapters, default_settings):
        """Test PDF with right alignment."""
        default_settings["defaultAlignment"] = "right"
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")

    def test_build_pdf_alignment_justify(self, sample_chapters, default_settings):
        """Test PDF with justified alignment."""
        default_settings["defaultAlignment"] = "justify"
        pdf_bytes = build_pdf(sample_chapters, default_settings)

        assert pdf_bytes.startswith(b"%PDF")

    # Helper Function Tests
    def test_format_chapter_title_number_only(self):
        """Test chapter title formatting with number only."""
        result = format_chapter_title("chapter-number", "Introduction", 1)
        assert result == "Chapter 1"

    def test_format_chapter_title_number_and_title(self):
        """Test chapter title formatting with number and title."""
        result = format_chapter_title(
            "chapter-number-title", "Introduction", 1
        )
        assert result == "Chapter 1: Introduction"

    def test_format_chapter_title_number_dot_title(self):
        """Test chapter title formatting with number and dot."""
        result = format_chapter_title("number-title", "Introduction", 1)
        assert result == "1. Introduction"

    def test_format_chapter_title_title_only(self):
        """Test chapter title formatting with title only."""
        result = format_chapter_title("title-only", "Introduction", 1)
        assert result == "Introduction"

    def test_format_chapter_title_invalid_format(self):
        """Test chapter title formatting with invalid format (fallback)."""
        result = format_chapter_title("invalid-format", "Introduction", 1)
        assert result == "Introduction"

    def test_get_alignment_left(self):
        """Test left alignment."""
        assert get_alignment("left") == WD_ALIGN_PARAGRAPH.LEFT

    def test_get_alignment_center(self):
        """Test center alignment."""
        assert get_alignment("center") == WD_ALIGN_PARAGRAPH.CENTER

    def test_get_alignment_right(self):
        """Test right alignment."""
        assert get_alignment("right") == WD_ALIGN_PARAGRAPH.RIGHT

    def test_get_alignment_justify(self):
        """Test justify alignment."""
        assert get_alignment("justify") == WD_ALIGN_PARAGRAPH.JUSTIFY

    def test_get_alignment_default(self):
        """Test default alignment for invalid input."""
        assert get_alignment("invalid") == WD_ALIGN_PARAGRAPH.LEFT

    # Edge Cases
    def test_build_pdf_very_long_title(self, default_settings):
        """Test PDF with very long chapter title."""
        chapters = [
            {
                "order": 0,
                "title": "A" * 200,  # Very long title
                "scenes": [{"content": "<p>Content</p>"}],
            }
        ]
        pdf_bytes = build_pdf(chapters, default_settings)
        assert pdf_bytes.startswith(b"%PDF")

    def test_build_docx_very_long_title(self, default_settings):
        """Test DOCX with very long chapter title."""
        chapters = [
            {
                "order": 0,
                "title": "A" * 200,  # Very long title
                "scenes": [{"content": "<p>Content</p>"}],
            }
        ]
        docx_bytes = build_docx(chapters, default_settings)
        assert docx_bytes.startswith(b"PK")

    def test_build_pdf_html_entities(self, default_settings):
        """Test PDF with HTML entities."""
        chapters = [
            {
                "order": 0,
                "title": "Test &amp; Demo",
                "scenes": [
                    {
                        "content": "<p>Special chars: &lt; &gt; &amp; &quot;</p>"
                    }
                ],
            }
        ]
        pdf_bytes = build_pdf(chapters, default_settings)
        assert pdf_bytes.startswith(b"%PDF")

    def test_build_docx_html_entities(self, default_settings):
        """Test DOCX with HTML entities."""
        chapters = [
            {
                "order": 0,
                "title": "Test & Demo",
                "scenes": [
                    {
                        "content": "<p>Special chars: &lt; &gt; &amp; &quot;</p>"
                    }
                ],
            }
        ]
        docx_bytes = build_docx(chapters, default_settings)
        assert docx_bytes.startswith(b"PK")

    def test_build_pdf_missing_reportlab_error(
        self, sample_chapters, default_settings, monkeypatch
    ):
        """Test PDF export fails gracefully if reportlab is unavailable."""
        # This test would require mocking REPORTLAB_AVAILABLE flag
        # Kept as reference for potential mock-based testing
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
