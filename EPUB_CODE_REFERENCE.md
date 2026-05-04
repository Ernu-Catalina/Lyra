# EPUB Export - Code Reference & Architecture

## Complete Implementation Reference

### 1. Frontend: ExportModal.tsx

**File:** `frontend/lyra-frontend/src/pages/editor/components/ExportModal.tsx`

```typescript
import { BookOpen } from "lucide-react";

interface ExportModalProps {
  onClose: () => void;
  onExport: (format: "pdf" | "docx" | "epub") => Promise<void>;
}

export function ExportModal({ onClose, onExport }: ExportModalProps) {
  const [exporting, setExporting] = useState<"pdf" | "docx" | "epub" | null>(null);

  const handleExport = async (format: "pdf" | "docx" | "epub") => {
    setExporting(format);
    try {
      await onExport(format);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    // ... modal JSX ...
    <button onClick={() => handleExport("epub")}>
      <BookOpen size={20} className="text-purple-500" />
      <div>EPUB Book (.epub)</div>
      <div>Reflowable ebook respecting your document settings</div>
    </button>
  );
}
```

### 2. Frontend: Editor Export Handler

**File:** `frontend/lyra-frontend/src/pages/editor/Editor.page.tsx` (line ~205)

```typescript
const handleExport = async (format: "pdf" | "docx" | "epub") => {
  if (!projectId || !documentId) throw new Error("Missing document context");

  const response = await api.request({
    url: `/projects/${projectId}/documents/${documentId}/export/${
      format === "epub" ? "epub" : format
    }`,
    method: format === "epub" ? "post" : "get",
    responseType: "blob",
  });

  const extension = format === "epub" ? "epub" : format;
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${outline?.title || "document"}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${extension.toUpperCase()} successfully.`);
};
```

### 3. Backend: EPUB Export Endpoint

**File:** `backend/app/routes/documents.py` (line 1031)

```python
from fastapi.responses import Response as FastAPIResponse
from app.services.export_service import build_docx, build_pdf, build_epub

@router.post("/{document_id}/export/epub")
async def export_document_epub(
    project_id: str,
    document_id: str,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(404, "Document not found")

    settings = document.get("settings") or {}
    chapters = sorted(document.get("chapters", []), key=lambda c: c.get("order", 0))
    for ch in chapters:
        ch["scenes"] = sorted(ch.get("scenes", []), key=lambda s: s.get("order", 0))

    doc_title = document.get("title", "document")
    data = build_epub(doc_title, chapters, settings)

    return FastAPIResponse(
        content=data,
        media_type="application/epub+zip",
        headers={"Content-Disposition": f'attachment; filename="{doc_title}.epub"'}
    )
```

### 4. Backend: EPUB Generation Service

**File:** `backend/app/services/export_service.py` (line 595)

```python
import uuid  # ADDED: Line 3

def build_epub(document_title: str, chapters: list, settings: dict) -> bytes:
    """
    Generate a valid EPUB3 file from document chapters and settings.

    Args:
        document_title: The title of the document
        chapters: List of chapter dicts with scenes
        settings: Document settings (fonts, margins, formatting, etc.)

    Returns:
        Bytes: EPUB file content as binary data
    """
    try:
        from ebooklib import epub
    except ImportError as exc:
        raise RuntimeError(
            "EPUB export requires ebooklib. Install with `pip install ebooklib`."
        ) from exc
    import html

    # Create book with metadata
    book = epub.EpubBook()
    book.set_identifier(str(uuid.uuid4()))
    book.set_title(document_title)
    language = settings.get("language") or "en"
    book.set_language(language)

    author = settings.get("author") or settings.get("creator")
    if author:
        book.add_author(str(author))

    # Extract document settings for styling
    default_font = settings.get("defaultFont", "Arial, sans-serif").split(",")[0].strip().strip("'\"")
    default_font_size = float(settings.get("defaultFontSize", 12))
    default_line_height = float(settings.get("defaultLineHeight", 1.15))
    default_indent_cm = _parse_cm(
        f"{settings.get('defaultFirstLineIndent', 0)}{settings.get('defaultFirstLineIndentUnit', 'cm')}"
    )

    margin_unit = settings.get("marginUnit", "cm")
    margin_top = _to_cm(settings.get("marginTop", 2.5), margin_unit)
    margin_bottom = _to_cm(settings.get("marginBottom", 2.5), margin_unit)
    margin_left = _to_cm(settings.get("marginLeft", 2.5), margin_unit)
    margin_right = _to_cm(settings.get("marginRight", 2.5), margin_unit)

    # Chapter title settings
    chapter_title_size = float(settings.get("chapterTitleSize", 16))
    chapter_title_alignment = settings.get("chapterTitleAlignment", "center")
    chapter_title_style = settings.get("chapterTitleStyle", "bold")
    chapter_title_weight = "bold" if "bold" in str(chapter_title_style) else "normal"
    chapter_title_italic = "italic" if "italic" in str(chapter_title_style) else "normal"
    chapter_blank_lines = int(settings.get("blankLinesAfterChapter", 2))
    blank_margin = max(1, chapter_blank_lines) * 0.8

    # Generate CSS stylesheet with all settings
    css = f"""
    body {{
      font-family: '{default_font}', serif;
      font-size: {default_font_size}pt;
      line-height: {default_line_height};
      margin: 0;
      padding: {margin_top}cm {margin_right}cm {margin_bottom}cm {margin_left}cm;
    }}
    p {{
      text-indent: {default_indent_cm}cm;
      margin: 0 0 1em 0;
    }}
    .chapter-title {{
      font-size: {chapter_title_size}pt;
      font-weight: {chapter_title_weight};
      font-style: {chapter_title_italic};
      text-align: {chapter_title_alignment};
      margin: 0 0 {blank_margin}em 0;
    }}
    .scene {{
      margin-bottom: 1.25em;
    }}
    h1, h2, h3, h4, h5, h6 {{
      margin: 0.8em 0 0.4em 0;
    }}
    """

    # Add stylesheet to EPUB
    style_item = epub.EpubItem(
        uid="style",
        file_name="styles/epub_styles.css",
        media_type="text/css",
        content=css.encode("utf-8"),
    )
    book.add_item(style_item)

    # Build chapters and table of contents
    spine = ["nav"]
    toc = []

    for ch_idx, chapter in enumerate(chapters):
        chapter_title = chapter.get("title", "") or f"Chapter {ch_idx + 1}"
        formatted_title = _format_chapter_title(ch_idx + 1, chapter_title, settings)
        chapter_label = formatted_title or chapter_title

        # Build chapter body with all scenes
        chapter_body = []
        if formatted_title:
            chapter_body.append(f"<h1 class='chapter-title'>{html.escape(formatted_title)}</h1>")

        for scene in chapter.get("scenes", []):
            content = scene.get("content", "") or ""
            # Remove page-break-spacer divs (editor-only elements)
            content = re.sub(
                r'<div[^>]*data-type="page-break-spacer"[^>]*>.*?</div>',
                "",
                content,
                flags=re.DOTALL,
            ).strip()
            if not content:
                continue
            chapter_body.append(f"<div class='scene'>{content}</div>")

        html_content = "\n".join(chapter_body) or "<p></p>"

        # Create XHTML document for chapter
        page = epub.EpubHtml(
            title=chapter_label,
            file_name=f"chapter_{ch_idx + 1}.xhtml",
            lang=language,
            content=(
                "<?xml version='1.0' encoding='utf-8'?>"
                "<html xmlns='http://www.w3.org/1999/xhtml'>"
                "<head><meta charset='utf-8'/><title>"
                f"{html.escape(chapter_label)}"
                "</title></head>"
                "<body>"
                f"{html_content}"
                "</body></html>"
            ),
        )
        page.add_item(style_item)
        book.add_item(page)

        toc.append(epub.Link(page.file_name, chapter_label, page.file_name))
        spine.append(page)

    # Finalize EPUB structure
    book.toc = toc
    book.spine = spine
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # Write EPUB to bytes
    buf = io.BytesIO()
    epub.write_epub(buf, book)
    return buf.getvalue()
```

### 5. Dependencies

**File:** `backend/requirements.txt`

```
ebooklib==0.18.1  # EPUB3 generation
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  User Opens     │
│  Editor         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  User Clicks Export Button  │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  ExportModal Opens           │
│  - DOCX option              │
│  - PDF option               │
│  - EPUB option ✨ NEW       │
└────────┬─────────────────────┘
         │
         ▼ (User selects EPUB)
┌──────────────────────────────────────┐
│  Editor.handleExport("epub")         │
│  - POST /projects/{id}/documents/   │
│    {id}/export/epub                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  API Request (with Bearer token)     │
│  Method: POST                        │
│  ResponseType: blob                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Backend: FastAPI Route              │
│  @router.post("/{document_id}/       │
│   export/epub")                      │
├──────────────────────────────────────┤
│ 1. Verify authentication             │
│ 2. Check document ownership          │
│ 3. Get chapters and scenes           │
│ 4. Extract document settings         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Service: build_epub()               │
├──────────────────────────────────────┤
│ 1. Create EPUB book object           │
│ 2. Set metadata (title, author, etc) │
│ 3. Generate CSS from settings        │
│ 4. Process chapters:                 │
│    - Format chapter titles           │
│    - Concatenate scenes              │
│    - Remove spacer divs              │
│ 5. Create XHTML documents            │
│ 6. Build navigation (TOC, NCX, NAV)  │
│ 7. Write as ZIP archive              │
│ 8. Return bytes                      │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  FastAPI Response                    │
├──────────────────────────────────────┤
│ Status: 200 OK                       │
│ Content-Type: application/epub+zip   │
│ Content-Disposition:                 │
│   attachment; filename="{title}.epub"│
│ Body: EPUB bytes                     │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Frontend: Handle Response            │
│ 1. Create blob from response         │
│ 2. Generate download link            │
│ 3. Trigger browser download          │
│ 4. Clean up resources                │
│ 5. Show success toast                │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  File Download Complete              │
│  {DocumentTitle}.epub ready          │
│  User can open in any EPUB reader    │
└──────────────────────────────────────┘
```

---

## HTTP Request Example

```http
POST /api/projects/507f1f77bcf86cd799439011/documents/507f1f77bcf86cd799439012/export/epub HTTP/1.1
Host: lyra-backend.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/epub+zip
Content-Length: 0

---

HTTP/1.1 200 OK
Content-Type: application/epub+zip
Content-Disposition: attachment; filename="My Novel.epub"
Content-Length: 42857
Transfer-Encoding: chunked

[EPUB file bytes as binary data]
```

---

## EPUB File Structure Example

```
my-novel.epub (ZIP archive)
├── mimetype
│   └── "application/epub+zip"
│
├── META-INF/
│   ├── container.xml
│   └── (metadata files)
│
├── OEBPS/
│   ├── package.opf
│   ├── styles/
│   │   └── epub_styles.css
│   │       └── Fonts, margins, colors from settings
│   │
│   ├── chapter_1.xhtml
│   │   ├── <h1 class="chapter-title">Chapter 1: Beginning</h1>
│   │   ├── <div class="scene">Scene 1 content with HTML...</div>
│   │   └── <div class="scene">Scene 2 content...</div>
│   │
│   ├── chapter_2.xhtml
│   │   └── (similar structure)
│   │
│   ├── nav.xhtml
│   │   └── Navigation/TOC in XHTML format
│   │
│   ├── toc.ncx
│   │   └── Legacy TOC format for compatibility
│   │
│   └── content.opf
│       └── Package document with metadata
```

---

## Integration Points

### Request Handling

```
axios.request({
  url: `/projects/{id}/documents/{id}/export/epub`,
  method: "post",
  responseType: "blob"
})
↓
api.ts (Bearer token added by interceptor)
↓
FastAPI handler receives POST
↓
build_epub() generates bytes
↓
FastAPIResponse returns attachment
↓
blob received in browser
↓
File download initiated
```

### Settings Mapping

```
Frontend DocumentSettings → Backend API → build_epub()

settings = {
  defaultFont: "Georgia, serif"      → CSS font-family
  defaultFontSize: 14                → CSS font-size (pt)
  defaultLineHeight: 1.5             → CSS line-height
  marginTop/Bottom/Left/Right: 2.5   → CSS padding
  chapterTitleFormat: "chapter-number-title"
                                     → HTML h1 class="chapter-title"
  chapterTitleSize: 16               → CSS font-size
  chapterTitleAlignment: "center"    → CSS text-align
  chapterTitleStyle: "bold"          → CSS font-weight
  ...
}
```

---

## Error Handling

### Frontend

```typescript
try {
  const response = await api.request({...});
  // Download handling
} catch (err: any) {
  setError(
    err?.response?.data?.detail ||
    err?.message ||
    "Export failed. Please try again."
  );
}
```

### Backend

```python
# Authentication check
document = await get_owned_document(user_id, project_id, document_id)
if not document:
    raise HTTPException(404, "Document not found")

# Service errors
try:
    from ebooklib import epub
except ImportError as exc:
    raise RuntimeError("EPUB export requires ebooklib...") from exc
```

---

## Testing Command

```bash
# Run unit tests
pytest tests/test_epub_export.py -v

# Verify implementation
python verify_epub.py

# Test endpoint directly
curl -X POST \
  'http://localhost:8000/api/projects/{pid}/documents/{did}/export/epub' \
  -H "Authorization: Bearer {token}" \
  -o "document.epub"
```

---

## Browser Compatibility

| Browser | Support | Notes                |
| ------- | ------- | -------------------- |
| Chrome  | ✅ Full | Modern blob handling |
| Firefox | ✅ Full | Standard blob API    |
| Safari  | ✅ Full | iOS and macOS        |
| Edge    | ✅ Full | Chromium-based       |

## EPUB Reader Support

| Reader            | Support | Platform              |
| ----------------- | ------- | --------------------- |
| Apple Books       | ✅ Full | iOS, macOS            |
| Calibre           | ✅ Full | Windows, macOS, Linux |
| Kindle            | ✅ Full | All platforms         |
| Google Play Books | ✅ Full | Android, Web          |
| Kobo              | ✅ Full | Devices               |

---

## Key Implementation Notes

1. **UUID for EPUB ID**: Each EPUB gets a unique identifier for reader tracking
2. **CSS Embedding**: Document settings embedded in stylesheet, no external resources
3. **XHTML Content**: HTML content preserved as-is in XHTML files
4. **Spacer Removal**: Editor-only `data-type="page-break-spacer"` divs stripped
5. **Navigation**: Automatic TOC generation from chapter structure
6. **Font Handling**: System fonts used (no font files embedded)
7. **Margins**: Applied via CSS padding in body selector
8. **Spine Order**: Controls reading order, respects chapter/scene order

---

End of Code Reference
