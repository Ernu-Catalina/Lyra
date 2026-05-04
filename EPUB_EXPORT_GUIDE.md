# EPUB Export Feature - Implementation Guide & Testing

## ✅ Implementation Status: COMPLETE

The EPUB export feature is fully integrated into the Lyra application. All components are in place and ready for use.

---

## Architecture Overview

### Frontend Integration

- **Component**: `src/pages/editor/components/ExportModal.tsx`
  - Adds "EPUB Book (.epub)" option alongside PDF and DOCX
  - Uses BookOpen icon from lucide-react (purple color)
  - Shows loading state during export

- **Handler**: `src/pages/editor/Editor.page.tsx` (line ~205)
  - `handleExport()` function routes EPUB exports to `/export/epub` endpoint with POST method
  - Handles blob download and file naming
  - Shows success toast notification

### Backend Integration

#### Endpoint

- **Route**: `POST /api/projects/{project_id}/documents/{document_id}/export/epub`
- **Handler**: `app/routes/documents.py` (line 1031)
- **File**: Returns EPUB as downloadable attachment with proper Content-Disposition headers

#### Service

- **Function**: `build_epub()` in `app/services/export_service.py` (line 595)
- **Generator**: Uses `ebooklib` library to create valid EPUB3 format

#### Dependencies

- **Added**: `ebooklib==0.18.1` in `requirements.txt`
- All other dependencies already present

---

## Feature Details

### What Gets Included in EPUB Export

1. **Document Metadata**
   - Title (document name)
   - Author (from document settings if available)
   - Language (from settings, defaults to "en")
   - Unique identifier (UUID)

2. **Document Settings Applied**
   - Default font family and size
   - Line height
   - Margins (top, bottom, left, right)
   - First-line paragraph indentation
   - Chapter title formatting (number, number+title, title-only, none)
   - Chapter title styling (bold, italic, alignment)
   - Blank lines after chapter

3. **Content Structure**
   - All chapters (in order)
   - All scenes within each chapter (in order)
   - Chapter titles formatted according to settings
   - Scene content with HTML formatting preserved

4. **HTML Support**
   - Preserves inline formatting: bold, italic, underline, strikethrough
   - Supports headings (h1-h6) with automatic sizing
   - Blockquotes
   - Paragraph styling and indentation
   - Removes page-break-spacer divs (editor-only elements)

5. **Valid EPUB3 Format**
   - Proper mimetype file
   - Container.xml for EPUB metadata
   - NCX and NAV files for navigation
   - Embedded CSS stylesheet with document settings
   - Chapter files as XHTML documents

---

## Testing Instructions

### Manual Testing (via UI)

1. **Open a document in the editor**
   - Navigate to a project with a document

2. **Click Export Button**
   - In the editor toolbar, click the Export button (or use ExportModal if available)

3. **Select EPUB**
   - In the export modal, click "EPUB Book (.epub)"
   - The button should show "Exporting..." state

4. **Download Confirmation**
   - File should download as `{DocumentTitle}.epub`
   - Success toast should appear

5. **Verify EPUB File**
   - Open in EPUB reader (e.g., Calibre, Apple Books, Kindle)
   - Check that:
     - Document title displays correctly
     - Chapter titles are formatted as configured
     - All scene content is present
     - Formatting is preserved (bold, italic, etc.)
     - Margins and spacing match settings

### Programmatic Testing

**Run unit tests:**

```bash
cd backend
python -m pytest tests/test_epub_export.py -v
```

**Test file location:**
`tests/test_epub_export.py`

**Test Coverage:**

- Basic EPUB generation with chapters and scenes
- HTML formatting preservation (bold, italic, headings)
- Document settings application
- Empty chapter handling
- Page-break-spacer removal
- EPUB3 format validation

### Test EPUB Generation Directly (Python)

```python
from app.services.export_service import build_epub

# Prepare test data
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
                "content": "<p>Hello, EPUB!</p>",
            }
        ],
    }
]

settings = {
    "defaultFont": "Arial, sans-serif",
    "defaultFontSize": 12,
    "defaultLineHeight": 1.15,
    "chapterTitleFormat": "chapter-number-title",
    "language": "en",
}

# Generate EPUB
epub_bytes = build_epub("My Document", chapters, settings)

# Save to file
with open("test_output.epub", "wb") as f:
    f.write(epub_bytes)

# Verify it's a valid zip/EPUB
import zipfile
import io
with zipfile.ZipFile(io.BytesIO(epub_bytes), "r") as z:
    print("Files in EPUB:", z.namelist())
    print("Mimetype:", z.read("mimetype").decode("utf-8"))
```

### API Endpoint Testing (cURL)

```bash
# Authenticate and export EPUB
curl -X POST \
  'http://localhost:8000/api/projects/{project_id}/documents/{document_id}/export/epub' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -o "exported_document.epub"
```

---

## File Structure

```
Backend:
├── app/
│   ├── routes/
│   │   └── documents.py
│   │       └── @router.post("/{document_id}/export/epub") [line 1031]
│   │       └── imports: build_epub from export_service [line 1029]
│   └── services/
│       └── export_service.py
│           └── def build_epub(document_title, chapters, settings) [line 595]
│               └── Uses ebooklib for EPUB3 generation
│               └── Applies document settings to styles
│               └── Formats chapter titles
│               └── Handles HTML content
└── requirements.txt
    └── ebooklib==0.18.1

Frontend:
├── src/
│   └── pages/
│       └── editor/
│           ├── Editor.page.tsx
│           │   └── handleExport() [line 205]
│           │       └── POST to /export/epub endpoint
│           │       └── Handles blob download
│           └── components/
│               └── ExportModal.tsx
│                   └── EPUB export option with BookOpen icon
```

---

## Troubleshooting

### Issue: "ebooklib not installed"

**Solution:**

```bash
pip install ebooklib==0.18.1
```

### Issue: EPUB file won't open in reader

**Check:**

1. Download completed without errors (browser console)
2. File size > 1KB
3. Can open in Python: `zipfile.ZipFile("file.epub", "r")`
4. Contains valid XHTML in chapter files

### Issue: Missing content in exported EPUB

**Check:**

1. All scenes have content
2. Content doesn't contain only spacer divs
3. HTML is well-formed (closing tags present)
4. Document settings are properly saved

### Issue: EPUB styling looks wrong

**Check:**

1. Font family is valid (reverts to serif if not available)
2. Font size values are positive numbers
3. Line height is > 0.5
4. Margins are reasonable (not excessive)

---

## Key Implementation Details

### EPUB Generation Process

1. **Create Book Object** with metadata
   - UUID identifier
   - Title, author, language
2. **Generate CSS Stylesheet** with document settings
   - Applies margins via padding
   - Sets default font and size
   - Configures line height and paragraph indentation
3. **Process Chapters**
   - Format chapter titles using settings
   - Concatenate all scenes as XHTML
   - Remove editor-only elements (page-break-spacers)
   - Create XHTML document for each chapter
4. **Add Navigation**
   - Table of contents (NCX)
   - Navigation page (NAV)
   - Spine (reading order)
5. **Write EPUB File**
   - Compress as ZIP with proper structure
   - Set correct mimetype
   - Return as downloadable blob

### Document Settings Respected

| Setting                     | EPUB Implementation                       |
| --------------------------- | ----------------------------------------- |
| defaultFont                 | Applied via CSS font-family               |
| defaultFontSize             | Applied via CSS font-size                 |
| defaultLineHeight           | Applied via CSS line-height               |
| marginTop/Bottom/Left/Right | Applied via CSS padding                   |
| defaultFirstLineIndent      | Applied via CSS text-indent               |
| chapterTitleFormat          | Applied during chapter heading generation |
| chapterTitleSize            | Applied to h1.chapter-title               |
| chapterTitleAlignment       | Applied via CSS text-align                |
| chapterTitleStyle           | Applied via font-weight and font-style    |
| blankLinesAfterChapter      | Applied as margin-bottom                  |

---

## Browser Compatibility

The EPUB export works in all modern browsers:

- Chrome/Chromium
- Firefox
- Safari
- Edge

EPUB files can be opened in:

- Apple Books (macOS, iOS)
- Google Play Books
- Amazon Kindle
- Calibre (cross-platform)
- Kobo readers
- Most e-reader applications

---

## Next Steps (Optional Enhancements)

1. **Cover Image**
   - Add document cover image generation
   - Include metadata.opf with cover image reference

2. **Table of Contents**
   - Generate detailed TOC from document structure
   - Link to chapters and scenes

3. **Export Presets**
   - Save/load export setting combinations
   - Quick export with previous settings

4. **Batch Export**
   - Export multiple documents at once
   - Combine documents into single EPUB

5. **Advanced Styling**
   - CSS classes for scene breaks
   - Custom styling per chapter
   - Support for images and embedded media

---

## Verification Checklist

- [x] EPUB endpoint exists at POST `/export/epub`
- [x] Frontend ExportModal has EPUB option
- [x] Editor.page.tsx handleExport supports EPUB
- [x] build_epub function implemented
- [x] ebooklib dependency added
- [x] Document settings applied to EPUB
- [x] Chapter titles formatted correctly
- [x] HTML content preserved
- [x] File downloads with correct name
- [x] Valid EPUB3 structure
- [x] Tests created and pass

## Success! 🎉

The EPUB export feature is production-ready and fully integrated with the existing Lyra codebase.
