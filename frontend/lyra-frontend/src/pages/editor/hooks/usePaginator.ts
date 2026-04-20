import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { DocumentSettings } from "../context/DocumentSettingsContext";
import { PAGE_BREAK_SPACER_TYPE } from "../extensions/PageBreakSpacer";

const MM_TO_PX = 3.7795275591;
function mmToPx(mm: number) { return mm * MM_TO_PX; }
function convertToMm(value: number, unit: "mm" | "cm" | "in") {
  if (unit === "cm") return value * 10;
  if (unit === "in") return value * 25.4;
  return value;
}

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A4:     { width: 210,   height: 297   },
  Letter: { width: 215.9, height: 279.4 },
  A5:     { width: 148,   height: 210   },
  Legal:  { width: 215.9, height: 355.6 },
};

export function usePaginator(
  editor: Editor | null,
  settings: DocumentSettings,
  scale: number
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent re-entrant pagination runs
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!editor) return;

    const runPagination = () => {
      if (isRunningRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (!editor || !editor.isEditable) return;
        isRunningRef.current = true;
        try {
          paginate(editor, settings, scale);
        } finally {
          isRunningRef.current = false;
        }
      }, 150);
    };

    // Run on every document change
    editor.on("update", runPagination);
    // Run once on mount and when settings/scale change
    runPagination();

    return () => {
      editor.off("update", runPagination);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor, settings, scale]);
}


function paginate(
  editor: Editor,
  settings: DocumentSettings,
  scale: number
) {
  const paperSize =
    settings.paperFormat === "Custom"
      ? { width: settings.customWidth, height: settings.customHeight }
      : PAPER_SIZES[settings.paperFormat] ?? PAPER_SIZES.A4;

  const marginTopMm    = convertToMm(settings.marginTop,    settings.marginUnit);
  const marginBottomMm = convertToMm(settings.marginBottom, settings.marginUnit);

  const pageHeightPx    = mmToPx(paperSize.height);
  const marginTopPx     = mmToPx(marginTopMm);
  const marginBottomPx  = mmToPx(marginBottomMm);
  const usableHeightPx  = pageHeightPx - marginTopPx - marginBottomPx;

  // GAP between page sheets on screen (matches SceneEditorPageView)
  const GAP_PX = 24;
  // Total spacer height per page boundary
  const spacerHeightPx = marginBottomPx + GAP_PX + marginTopPx;

  const doc = editor.state.doc;
  const view = editor.view;

  // ── Step 1: collect all top-level block nodes with their positions ──
  type BlockEntry = {
    pos: number;          // ProseMirror position before the node
    node: typeof doc.firstChild; // the node itself
    isSpacer: boolean;
  };

  const blocks: BlockEntry[] = [];
  doc.forEach((node, offset) => {
    blocks.push({
      pos: offset,
      node,
      isSpacer: node.type.name === PAGE_BREAK_SPACER_TYPE,
    });
  });

  // ── Step 2: measure rendered height of each non-spacer block ────────
  // We must measure from the DOM. Spacers are excluded from height sum.
  type MeasuredBlock = {
    pos: number;
    heightPx: number;
    isSpacer: boolean;
    existingSpacerPageIndex?: number;
  };

  const measured: MeasuredBlock[] = [];

  for (const block of blocks) {
    if (block.isSpacer) {
      measured.push({
        pos: block.pos,
        heightPx: 0, // excluded from content height
        isSpacer: true,
        existingSpacerPageIndex: (block.node as any).attrs?.pageIndex ?? 0,
      });
      continue;
    }

    // Get the DOM node for this block
    let domNode: HTMLElement | null = null;
    try {
      const domResult = view.domAtPos(block.pos + 1);
      let el: Node | null = domResult.node;
      // Walk up to find the block-level element
      while (el && el.nodeType !== Node.ELEMENT_NODE) {
        el = el.parentNode;
      }
      while (
        el &&
        el.parentElement &&
        el.parentElement !== view.dom &&
        el.parentElement.parentElement !== view.dom
      ) {
        el = el.parentElement;
      }
      domNode = el as HTMLElement;
    } catch {
      // If measurement fails, assume 0 height — safe fallback
    }

    const heightPx = domNode
      ? Math.round(domNode.getBoundingClientRect().height / scale)
      : 0;

    measured.push({
      pos: block.pos,
      heightPx,
      isSpacer: false,
    });
  }

  // ── Step 3: walk blocks and determine where spacers should go ────────
  // We want spacers BETWEEN the block that overflows and the next block.
  // pageIndex tracks which page break spacer this is (0 = between page 1 and 2)

  type SpacerSpec = {
    afterPos: number;   // insert spacer after the block at this pos
    pageIndex: number;
  };

  const neededSpacers: SpacerSpec[] = [];
  let accumulatedPx = 0;
  let pageIndex = 0;

  for (const block of measured) {
    if (block.isSpacer) continue; // skip existing spacers in the walk

    const blockH = block.heightPx;

    if (accumulatedPx + blockH > usableHeightPx && accumulatedPx > 0) {
      // This block would overflow — insert spacer before it
      neededSpacers.push({
        afterPos: block.pos,
        pageIndex,
      });
      pageIndex++;
      accumulatedPx = blockH; // this block starts the new page
    } else {
      accumulatedPx += blockH;

      // If the block itself is taller than a full page, it spans multiple pages
      // Insert additional spacers for each full page it spans
      if (blockH > usableHeightPx) {
        const extraPages = Math.floor(blockH / usableHeightPx);
        for (let p = 0; p < extraPages; p++) {
          neededSpacers.push({
            afterPos: block.pos,
            pageIndex,
          });
          pageIndex++;
        }
        accumulatedPx = blockH % usableHeightPx;
      }
    }
  }

  // ── Step 4: diff against existing spacers — only update if changed ──
  const existingSpacers = measured.filter((b) => b.isSpacer);

  const existingCount  = existingSpacers.length;
  const neededCount    = neededSpacers.length;

  // Check if spacers are already correct (count and positions match)
  // If so, skip the transaction to avoid an infinite update loop
  const alreadyCorrect =
    existingCount === neededCount &&
    existingSpacers.every((sp, i) => {
      return sp.existingSpacerPageIndex === neededSpacers[i]?.pageIndex;
    });

  if (alreadyCorrect) return;

  // ── Step 5: apply transaction ─────────────────────────────────────
  // Remove all existing spacers, then insert new ones.
  // We do this in a single transaction to avoid multiple re-renders.

  const { state } = editor;
  let tr = state.tr;

  // Remove existing spacers (iterate in reverse to keep positions valid)
  const spacerPositions: number[] = [];
  state.doc.forEach((node, offset) => {
    if (node.type.name === PAGE_BREAK_SPACER_TYPE) {
      spacerPositions.push(offset);
    }
  });

  // Delete in reverse order so earlier positions stay valid
  for (let i = spacerPositions.length - 1; i >= 0; i--) {
    const pos = spacerPositions[i];
    tr = tr.delete(pos, pos + state.doc.nodeAt(pos)!.nodeSize);
  }

  const stateAfterDelete = state.apply(tr);

  let insertTr = stateAfterDelete.tr;


  const nonSpacerBlocks: number[] = [];
  state.doc.forEach((node, offset) => {
    if (node.type.name !== PAGE_BREAK_SPACER_TYPE) {
      nonSpacerBlocks.push(offset);
    }
  });


  const insertions: Array<{ blockIndex: number; pageIndex: number }> = [];
  for (const spec of neededSpacers) {
    const blockIdx = nonSpacerBlocks.indexOf(spec.afterPos);
    if (blockIdx >= 0) {
      insertions.push({ blockIndex: blockIdx, pageIndex: spec.pageIndex });
    }
  }

  // Sort insertions in reverse order so later insertions don't shift earlier ones
  insertions.sort((a, b) => b.blockIndex - a.blockIndex);

  // Walk the post-delete doc to find actual positions
  const postDeleteBlocks: number[] = [];
  stateAfterDelete.doc.forEach((node, offset) => {
    postDeleteBlocks.push(offset);
  });

  for (const ins of insertions) {
    const insertPos = postDeleteBlocks[ins.blockIndex];
    if (insertPos === undefined) continue;

    const spacerNode = stateAfterDelete.schema.nodes[PAGE_BREAK_SPACER_TYPE].create({
      height: spacerHeightPx,
      pageIndex: ins.pageIndex,
    });

    insertTr = insertTr.insert(insertPos, spacerNode);
  }

  // Mark transaction as not adding to undo history
  // (spacers are layout artifacts, not user edits)
  insertTr.setMeta("addToHistory", false);
  insertTr.setMeta("pagination", true);

  editor.view.dispatch(insertTr);
}