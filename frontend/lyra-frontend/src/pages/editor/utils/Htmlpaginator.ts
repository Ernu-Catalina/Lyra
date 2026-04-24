/**
 * htmlPaginator.ts
 *
 * Splits an HTML string into an array of HTML strings, one per page.
 *
 * Strategy:
 * 1. Parse the HTML into a temporary off-screen container at the exact
 *    content column width so the browser lays out text identically to
 *    how it will appear on screen.
 * 2. Walk every top-level block element, reading its offsetTop + offsetHeight.
 * 3. When a block would overflow the current page's usable height, start a
 *    new page. If the block is a paragraph with multiple lines, attempt a
 *    line-level split so text flows naturally across the page boundary.
 * 4. Serialize each page's collected nodes back to HTML strings.
 *
 * The returned strings can be rendered with dangerouslySetInnerHTML — each
 * one is a complete, self-contained fragment of the original content.
 */

export interface PaginatorSettings {
  pageWidthPx: number;
  pageHeightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  fontFamily: string;
  fontSize: string;       // e.g. "12pt"
  lineHeight: number;     // e.g. 1.5
  textAlign: string;      // e.g. "left"
}

/**
 * Splits an HTML string into one HTML string per page.
 * Returns at least one page even if content is empty.
 */
export function paginateHtml(
  html: string,
  settings: PaginatorSettings
): string[] {
  if (!html.trim()) return [""];

  const {
    pageWidthPx,
    pageHeightPx,
    marginTopPx,
    marginBottomPx,
    marginLeftPx,
    marginRightPx,
    fontFamily,
    fontSize,
    lineHeight,
    textAlign,
  } = settings;

  const contentWidthPx  = pageWidthPx - marginLeftPx - marginRightPx;
  const usableHeightPx  = pageHeightPx - marginTopPx - marginBottomPx;

  // ── 1. Create off-screen measurement container ────────────────────
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: -99999px;
    left: -99999px;
    width: ${contentWidthPx}px;
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: ${lineHeight};
    text-align: ${textAlign};
    visibility: hidden;
    pointer-events: none;
    box-sizing: border-box;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  // Force layout
  void container.offsetHeight;

  const blocks = Array.from(container.children) as HTMLElement[];

  // ── 2. Walk blocks and assign to pages ───────────────────────────
  const pages: Node[][] = [[]];
  let pageContentUsed = 0; // px of usableHeightPx consumed on current page

  for (const block of blocks) {
    const blockH = block.offsetHeight;

    if (pageContentUsed + blockH <= usableHeightPx) {
      // Block fits on current page
      pages[pages.length - 1].push(block.cloneNode(true));
      pageContentUsed += blockH;
      continue;
    }

    // Block doesn't fit — try line-level split for paragraphs
    const remaining = usableHeightPx - pageContentUsed;
    const splitResult = trySplitBlock(block, remaining, usableHeightPx, container);

    if (splitResult) {
      const { topHtml, bottomHtml, bottomHeight } = splitResult;

      // Top portion goes on current page
      if (topHtml) {
        const topEl = document.createElement(block.tagName);
        topEl.innerHTML = topHtml;
        copyAttributes(block, topEl);
        pages[pages.length - 1].push(topEl);
      }

      // Start new page with bottom portion
      pages.push([]);
      pageContentUsed = 0;

      if (bottomHtml) {
        const botEl = document.createElement(block.tagName);
        botEl.innerHTML = bottomHtml;
        copyAttributes(block, botEl);
        pages[pages.length - 1].push(botEl);
        pageContentUsed = bottomHeight;
      }
    } else {
      // Can't split — push whole block to new page
      // (unless current page is empty, in which case just add it)
      if (pageContentUsed > 0) {
        pages.push([]);
        pageContentUsed = 0;
      }
      pages[pages.length - 1].push(block.cloneNode(true));
      pageContentUsed = blockH;

      // If this single block is taller than one full page, keep splitting
      while (pageContentUsed > usableHeightPx) {
        pages.push([]);
        pageContentUsed -= usableHeightPx;
      }
    }
  }

  // ── 3. Clean up ───────────────────────────────────────────────────
  document.body.removeChild(container);

  // ── 4. Serialize pages to HTML strings ───────────────────────────
  const serializer = new XMLSerializer();

  return pages.map((nodes) => {
    if (nodes.length === 0) return "";
    const wrapper = document.createElement("div");
    nodes.forEach((n) => wrapper.appendChild(n));
    return wrapper.innerHTML;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Copy all attributes from src element to dst element.
 */
function copyAttributes(src: HTMLElement, dst: HTMLElement): void {
  Array.from(src.attributes).forEach((attr) => {
    dst.setAttribute(attr.name, attr.value);
  });
}

/**
 * Attempts to split a block element at the line boundary that fits within
 * `remainingPx`. Returns { topHtml, bottomHtml, bottomHeight } or null if
 * the split is not possible (e.g. block has no text, only one line, etc).
 *
 * Uses the Range API to get per-line bounding rects, finds how many lines
 * fit, then splits the text content at that character position.
 */
function trySplitBlock(
  block: HTMLElement,
  remainingPx: number,
  usableHeightPx: number,
  container: HTMLElement
): { topHtml: string; bottomHtml: string; bottomHeight: number } | null {
  // Only attempt split on block-level text elements
  if (!["P", "DIV", "BLOCKQUOTE", "LI"].includes(block.tagName)) return null;

  const lineRects = getLineRects(block);
  if (lineRects.length <= 1) return null;

  // Find how many lines fit in the remaining space
  let fittingLines = 0;
  let fittingHeight = 0;
  const blockTop = block.getBoundingClientRect().top;

  for (const rect of lineRects) {
    if (fittingHeight + rect.height <= remainingPx) {
      fittingHeight += rect.height;
      fittingLines++;
    } else {
      break;
    }
  }

  // Need at least one line on current page and one on next
  if (fittingLines === 0 || fittingLines >= lineRects.length) return null;

  const splitLineTop = lineRects[fittingLines].top;

  // Find the character offset where the split line begins
  const splitOffset = findCharOffsetAtLineTop(block, splitLineTop);
  if (splitOffset === null) return null;

  // Extract full text content and split at character offset
  const fullText = block.textContent ?? "";
  const topText = fullText.slice(0, splitOffset);
  const bottomText = fullText.slice(splitOffset);

  if (!topText.trim() && !bottomText.trim()) return null;

  // Build top and bottom HTML by cloning the block and trimming text nodes.
  // This preserves inline styles/marks (bold, italic, etc).
  const topHtml  = extractHtmlSlice(block, 0, splitOffset);
  const bottomHtml = extractHtmlSlice(block, splitOffset, fullText.length);

  // Measure the bottom portion height
  const probe = document.createElement(block.tagName);
  probe.innerHTML = bottomHtml;
  copyAttributes(block, probe);
  probe.style.cssText += `
    position: fixed; top: -99999px; left: -99999px;
    width: ${container.offsetWidth}px; visibility: hidden;
  `;
  document.body.appendChild(probe);
  void probe.offsetHeight;
  const bottomHeight = probe.offsetHeight;
  document.body.removeChild(probe);

  return { topHtml, bottomHtml, bottomHeight };
}

/**
 * Returns one DOMRect per visual line inside an element using the Range API.
 * Groups character rects whose top values are within 2px into the same line.
 */
function getLineRects(el: HTMLElement): DOMRect[] {
  const lines: DOMRect[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent ?? "";
    for (let i = 0; i < text.length; i++) {
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width === 0 || rect.height === 0) continue;
        const existing = lines.find((l) => Math.abs(l.top - rect.top) < 2);
        if (existing) {
          const newBottom = Math.max(
            existing.top + existing.height,
            rect.top + rect.height
          );
          (existing as any).height = newBottom - existing.top;
        } else {
          lines.push(new DOMRect(rect.x, rect.top, rect.width, rect.height));
        }
      }
    }
  }

  return lines.sort((a, b) => a.top - b.top);
}

/**
 * Finds the character index in the element's textContent where a new
 * visual line begins at approximately `targetTop` (screen Y coordinate).
 */
function findCharOffsetAtLineTop(
  el: HTMLElement,
  targetTop: number
): number | null {
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent ?? "";
    for (let i = 0; i < text.length; i++) {
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      for (const rect of Array.from(range.getClientRects())) {
        if (Math.abs(rect.top - targetTop) < 2) {
          return charCount + i;
        }
      }
    }
    charCount += text.length;
  }

  return null;
}

/**
 * Extracts a character range [startOffset, endOffset) from an element's
 * content as an HTML string, preserving inline markup.
 *
 * Uses the Range API to select exactly the characters we want and
 * clones the resulting document fragment to a wrapper div.
 */
function extractHtmlSlice(
  el: HTMLElement,
  startOffset: number,
  endOffset: number
): string {
  // Map character offsets to DOM positions
  const startPos = charOffsetToRangePosition(el, startOffset);
  const endPos   = charOffsetToRangePosition(el, endOffset);

  if (!startPos || !endPos) {
    // Fallback: return full innerHTML for the range
    return el.innerHTML;
  }

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);

  const fragment = range.cloneContents();
  const wrapper = document.createElement("div");
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

/**
 * Converts a flat character offset (into el.textContent) to a
 * { node, offset } suitable for Range.setStart / Range.setEnd.
 */
function charOffsetToRangePosition(
  el: HTMLElement,
  targetOffset: number
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    const len = textNode.textContent?.length ?? 0;
    if (charCount + len >= targetOffset) {
      return { node: textNode, offset: targetOffset - charCount };
    }
    charCount += len;
  }

  // targetOffset is at or past the end — clamp to last text node
  if (textNode) {
    return { node: textNode, offset: textNode.textContent?.length ?? 0 };
  }

  return null;
}