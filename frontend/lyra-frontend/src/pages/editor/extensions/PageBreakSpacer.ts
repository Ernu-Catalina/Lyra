import { Node, mergeAttributes } from "@tiptap/core";

export const PAGE_BREAK_SPACER_TYPE = "pageBreakSpacer";

export const PageBreakSpacer = Node.create({
  name: PAGE_BREAK_SPACER_TYPE,

  group: "block",

  // No content — it is a void/leaf block
  atom: true,

  // Not selectable by the user
  selectable: false,

  // Not draggable
  draggable: false,

  addAttributes() {
    return {
      // Height in pixels — set by the paginator
      height: {
        default: 0,
        parseHTML: (element) =>
          parseFloat(element.getAttribute("data-height") || "0"),
        renderHTML: (attributes) => ({
          "data-height": attributes.height,
        }),
      },
      // Which page break this spacer belongs to (0-indexed)
      pageIndex: {
        default: 0,
        parseHTML: (element) =>
          parseInt(element.getAttribute("data-page-index") || "0", 10),
        renderHTML: (attributes) => ({
          "data-page-index": attributes.pageIndex,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-break-spacer"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break-spacer",
        contenteditable: "false",
        style: `
          height: ${HTMLAttributes["data-height"]}px;
          width: 100%;
          display: block;
          pointer-events: none;
          user-select: none;
          background: transparent;
        `.replace(/\s+/g, " ").trim(),
      }),
    ];
  },

  // Prevent the cursor from entering this node
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "page-break-spacer");
      dom.setAttribute("contenteditable", "false");
      dom.style.cssText = `
        height: ${node.attrs.height}px;
        width: 100%;
        display: block;
        pointer-events: none;
        user-select: none;
        background: transparent;
        position: relative;
      `;

      // Future: render header/footer content inside this spacer here.
      // The spacer height = marginBottom + GAP + marginTop.
      // Header zone = top marginBottom px of this div.
      // Footer zone = bottom marginTop px of this div.
      // Example (for future implementation):
      //
      // const footer = document.createElement("div");
      // footer.style.cssText = `
      //   position: absolute;
      //   bottom: ${GAP + marginTopPx}px;
      //   left: 0; right: 0;
      //   height: ${marginBottomPx}px;
      //   display: flex; align-items: center; justify-content: center;
      //   font-size: 10pt; color: #666;
      // `;
      // footer.textContent = "Page footer text";
      // dom.appendChild(footer);

      return {
        dom,
        // Tells ProseMirror this node has no editable content
        contentDOM: undefined,
      };
    };
  },
});

// Utility: strip all page break spacers from an HTML string before saving
export function stripSpacersFromHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc
    .querySelectorAll('div[data-type="page-break-spacer"]')
    .forEach((el) => el.remove());
  return doc.body.innerHTML;
}