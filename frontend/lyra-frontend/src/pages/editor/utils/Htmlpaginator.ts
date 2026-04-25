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
  firstLineIndent: string;
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
    text-indent: ${settings.firstLineIndent};
    visibility: hidden;
    pointer-events: none;
    box-sizing: border-box;
    --default-first-line-indent: ${settings.firstLineIndent};
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  // Force layout
  void container.offsetHeight;

  const blocks = Array.from(container.children) as HTMLElement[];

  // ── 2. Walk blocks and assign to pages ───────────────────────────
  // Use block.offsetTop (layout-accurate) rather than accumulated offsetHeight so
  // CSS margins between blocks are counted and don't cause overflow.
  const pages: Node[][] = [[]];
  let pageStart = 0; // the flow-Y (offsetTop in container) where the current page begins

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const relTop    = block.offsetTop - pageStart;
    const relBottom = relTop + block.offsetHeight;

    if (relBottom <= usableHeightPx + 30) {
      // Block fits on current page
      pages[pages.length - 1].push(block.cloneNode(true));
      continue;
    }

    // Block doesn't fit — try line-level split for paragraphs
    const remaining = usableHeightPx - relTop;
    const splitResult = trySplitBlock(block, remaining, usableHeightPx, container);

    if (splitResult) {
      const { topHtml, bottomHtml } = splitResult;

      // Top portion goes on current page
      if (topHtml) {
        const topEl = document.createElement(block.tagName);
        topEl.innerHTML = topHtml;
        copyAttributes(block, topEl);
        pages[pages.length - 1].push(topEl);
      }

      // Start new page with bottom portion; advance pageStart by exactly one page height
      pages.push([]);
      pageStart += usableHeightPx;

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = bottomHtml;
      const botEl = tempDiv.firstElementChild as HTMLElement;
      if (botEl) pages[pages.length - 1].push(botEl);
    } else {
      // Can't split — move whole block to next page (unless it's already at the top)
      if (relTop > 0) {
        pages.push([]);
        pageStart = block.offsetTop;
      }
      pages[pages.length - 1].push(block.cloneNode(true));

      // If this single block is taller than one full page, span multiple empty pages
      while (block.offsetTop + block.offsetHeight > pageStart + usableHeightPx) {
        pages.push([]);
        pageStart += usableHeightPx;
      }
    }
  }

  // ── 3. Clean up ───────────────────────────────────────────────────
  document.body.removeChild(container);

  // ── 4. Serialize pages to HTML strings ───────────────────────────
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
 * the split is not possible.
 *
 * Improved version: more aggressive fitting, better line measurement,
 * reduced safety margins, and prefers splitting when possible.
 */
function trySplitBlock(
  block: HTMLElement,
  remainingPx: number,
  usableHeightPx: number,
  container: HTMLElement
): { topHtml: string; bottomHtml: string; bottomHeight: number } | null {
  if (!["P", "DIV", "BLOCKQUOTE", "LI"].includes(block.tagName)) return null;

  const lineRects = getLineRects(block);
  if (lineRects.length <= 1) return null;

  const marginBottom = parseFloat(window.getComputedStyle(block).marginBottom) || 0;
  const firstLineHeight = lineRects[0]?.height ?? 0;

  // Allow split even if very little space remains on current page
  if (remainingPx < firstLineHeight * 0.6) return null;

  // Find maximum fitting lines (greedier than before)
  let fittingLines = 0;
  let fittingHeight = 0;

  for (let li = 0; li < lineRects.length; li++) {
    const rect = lineRects[li];
    const isLast = li === lineRects.length - 1;
    const effectiveHeight = rect.height + (isLast ? marginBottom : 0);

    if (fittingHeight + effectiveHeight <= remainingPx + 8) {   // +8px tolerance for better fill
      fittingHeight += rect.height;
      fittingLines++;
    } else {
      break;
    }
  }

  // Require at least one line on current page and one on next
  if (fittingLines === 0 || fittingLines >= lineRects.length) return null;

  const splitLineTop = lineRects[fittingLines].top;
  const splitOffset = findCharOffsetAtLineTop(block, splitLineTop);

  if (splitOffset === null || splitOffset === 0) return null;

  const fullText = block.textContent ?? "";
  const topText = fullText.slice(0, splitOffset);
  const bottomText = fullText.slice(splitOffset);

  if (!topText.trim() && !bottomText.trim()) return null;

  const topHtml = extractHtmlSlice(block, 0, splitOffset);
  const bottomHtml = extractHtmlSlice(block, splitOffset, fullText.length);

  // Build bottom element (continuation — no first-line indent)
  const botEl = document.createElement(block.tagName);
  botEl.innerHTML = bottomHtml;
  copyAttributes(block, botEl);
  botEl.style.textIndent = "0";

  // Measure bottom height accurately
  const probe = document.createElement(block.tagName);
  probe.innerHTML = botEl.innerHTML;
  copyAttributes(botEl, probe);
  probe.style.cssText += `
    position: fixed; top: -99999px; left: -99999px;
    width: ${container.offsetWidth}px; visibility: hidden;
  `;
  document.body.appendChild(probe);
  void probe.offsetHeight;
  const bottomHeight = probe.offsetHeight;
  document.body.removeChild(probe);

  const wrapper = document.createElement("div");
  wrapper.appendChild(botEl);
  const bottomHtmlFinal = wrapper.innerHTML;

  return { topHtml, bottomHtml: bottomHtmlFinal, bottomHeight };
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