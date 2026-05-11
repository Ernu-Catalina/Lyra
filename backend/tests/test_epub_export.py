"""
Test EPUB export functionality.
Tests the build_epub function and the export endpoint.
"""
import io
import zipfile
from app.services.export_service import build_epub


def test_build_epub_basic():
    """Test basic EPUB generation with chapters and scenes."""
    chapters = [
        {
            "id": "ch1",
            "title": "Chapter 1",
            "order": 0,
            "scenes": [
                {
                    "id": "sc1",
                    "title": "Scene 1",
                    "order": 0,
                    "content": "<p>This is scene 1 content.</p>",
                },
                {
                    "id": "sc2",
                    "title": "Scene 2",
                    "order": 1,
                    "content": "<p>This is scene 2 content with <strong>bold</strong> text.</p>",
                },
            ],
        },
        {
            "id": "ch2",
            "title": "Chapter 2",
            "order": 1,
            "scenes": [
                {
                    "id": "sc3",
                    "title": "Scene 3",
                    "order": 0,
                    "content": "<p>Content for chapter 2.</p><p>Another paragraph.</p>",
                },
            ],
        },
    ]

    settings = {
        "defaultFont": "Arial, sans-serif",
        "defaultFontSize": 12,
        "defaultLineHeight": 1.15,
        "defaultParagraphSpacing": 8,
        "defaultFirstLineIndent": 0,
        "defaultFirstLineIndentUnit": "cm",
        "marginTop": 2.5,
        "marginBottom": 2.5,
        "marginLeft": 2.5,
        "marginRight": 2.5,
        "marginUnit": "cm",
        "chapterTitleFormat": "chapter-number-title",
        "chapterTitleSize": 16,
        "chapterTitleAlignment": "center",
        "chapterTitleStyle": "bold",
        "blankLinesAfterChapter": 2,
        "language": "en",
        "author": "Test Author",
    }

    # Generate EPUB
    epub_data = build_epub("Test Document", chapters, settings)

    # Verify it's valid zip (EPUB is a zip file)
    assert isinstance(epub_data, bytes), "EPUB should be bytes"
    assert len(epub_data) > 0, "EPUB should have content"

    # Verify it's a valid EPUB structure
    epub_io = io.BytesIO(epub_data)
    with zipfile.ZipFile(epub_io, "r") as z:
        # EPUB must contain mimetype file
        assert "mimetype" in z.namelist(), "EPUB must contain mimetype"

        # Check mimetype content
        mimetype = z.read("mimetype").decode("utf-8").strip()
        assert (
            mimetype == "application/epub+zip"
        ), f"Expected 'application/epub+zip', got '{mimetype}'"

        # EPUB must contain container.xml
        assert "META-INF/container.xml" in z.namelist(), "EPUB must contain META-INF/container.xml"

        # EPUB should contain chapter files
        filelist = z.namelist()
        assert any(f.startswith("chapter_") for f in filelist), "EPUB should contain chapter files"

    print("✓ EPUB structure is valid")
    print(f"✓ Generated EPUB size: {len(epub_data)} bytes")


def test_build_epub_with_formatting():
    """Test EPUB with various HTML formatting and styles."""
    chapters = [
        {
            "id": "ch1",
            "title": "Formatted Chapter",
            "order": 0,
            "scenes": [
                {
                    "id": "sc1",
                    "title": "Scene with styles",
                    "order": 0,
                    "content": (
                        "<h2>Heading 2</h2>"
                        "<p>Normal paragraph with <strong>bold</strong>, "
                        "<em>italic</em>, and <u>underline</u>.</p>"
                        "<blockquote>A quote block</blockquote>"
                        "<p>Paragraph with <span style='font-size: 14pt'>larger text</span>.</p>"
                    ),
                },
            ],
        },
    ]

    settings = {
        "defaultFont": "Georgia, serif",
        "defaultFontSize": 14,
        "defaultLineHeight": 1.5,
        "defaultParagraphSpacing": 8,
        "chapterTitleFormat": "title-only",
        "language": "en",
    }

    epub_data = build_epub("Formatted Document", chapters, settings)
    assert isinstance(epub_data, bytes), "EPUB with formatting should be bytes"
    assert len(epub_data) > 0, "EPUB should have content"

    print("✓ EPUB with formatting generated successfully")


def test_build_epub_empty():
    """Test EPUB generation with empty chapters."""
    chapters = [
        {
            "id": "ch1",
            "title": "Empty Chapter",
            "order": 0,
            "scenes": [],
        }
    ]

    settings = {
        "defaultFont": "Arial",
        "defaultFontSize": 12,
        "language": "en",
    }

    epub_data = build_epub("Empty Document", chapters, settings)
    assert isinstance(epub_data, bytes), "EPUB with empty chapters should be bytes"
    assert len(epub_data) > 0, "EPUB should have valid structure even if empty"

    print("✓ EPUB with empty chapters generated successfully")


def test_build_epub_with_page_break_spacer():
    """Test that page-break-spacer divs are removed from content."""
    chapters = [
        {
            "id": "ch1",
            "title": "Chapter",
            "order": 0,
            "scenes": [
                {
                    "id": "sc1",
                    "title": "Scene",
                    "order": 0,
                    "content": (
                        "<p>Before spacer</p>"
                        '<div data-type="page-break-spacer" style="height: 500px;"></div>'
                        "<p>After spacer</p>"
                    ),
                },
            ],
        },
    ]

    settings = {
        "defaultFont": "Arial",
        "defaultFontSize": 12,
        "language": "en",
    }

    epub_data = build_epub("Document with Spacer", chapters, settings)

    # Extract and check content
    epub_io = io.BytesIO(epub_data)
    with zipfile.ZipFile(epub_io, "r") as z:
        chapter_files = [f for f in z.namelist() if f.startswith("chapter_")]
        assert len(chapter_files) > 0, "Should have chapter files"

        # Read first chapter
        chapter_content = z.read(chapter_files[0]).decode("utf-8")
        assert "page-break-spacer" not in chapter_content, "Spacer divs should be removed"
        assert "Before spacer" in chapter_content, "Content before spacer should exist"
        assert "After spacer" in chapter_content, "Content after spacer should exist"

    print("✓ Page-break-spacer divs correctly removed from EPUB")


if __name__ == "__main__":
    test_build_epub_basic()
    test_build_epub_with_formatting()
    test_build_epub_empty()
    test_build_epub_with_page_break_spacer()
    print("\n✅ All EPUB export tests passed!")
