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
  scale: number,
  isLoading: boolean = false
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!editor) return;
    if (isLoading) return; // Wait for settings to load before paginating

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

    editor.on("update", runPagination);
    runPagination();

    return () => {
      editor.off("update", runPagination);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor, settings, scale, isLoading]);
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

  const marginTopPx    = mmToPx(convertToMm(settings.marginTop,    settings.marginUnit));
  const marginBottomPx = mmToPx(convertToMm(settings.marginBottom, settings.marginUnit));
  const pageHeightPx   = mmToPx(paperSize.height);
  const usableHeightPx = pageHeightPx - marginTopPx - marginBottomPx;
  const GAP_PX         = Math.round(Math.min(marginTopPx, marginBottomPx) / 4);
  const spacerHeightPx = marginBottomPx + GAP_PX + marginTopPx;

  console.log("PAGINATOR GEOMETRY", {
    pageHeightPx, marginTopPx, marginBottomPx,
    usableHeightPx, spacerHeightPx, GAP_PX,
  });

  

  const { state } = editor; // declared once, used throughout
  const doc = state.doc;
  const view = editor.view;

  // ── Step 1: collect top-level blocks ──────────────────────────────
  type BlockEntry = { pos: number; node: any; isSpacer: boolean; };
  const blocks: BlockEntry[] = [];
  doc.forEach((node, offset) => {
    blocks.push({
      pos: offset,
      node,
      isSpacer: node.type.name === PAGE_BREAK_SPACER_TYPE,
    });
  });

  // ── Step 2: measure rendered height of non-spacer blocks ──────────
  type MeasuredBlock = {
    pos: number;
    heightPx: number;
    isSpacer: boolean;
    existingSpacerPageIndex?: number;
    existingSpacerHeight?: number;
  };

  const measured: MeasuredBlock[] = [];

  for (const block of blocks) {
    if (block.isSpacer) {
      measured.push({
        pos: block.pos,
        heightPx: 0,
        isSpacer: true,
        existingSpacerPageIndex: block.node.attrs?.pageIndex ?? 0,
        existingSpacerHeight: block.node.attrs?.height ?? 0,
      });
      continue;
    }

    let domNode: HTMLElement | null = null;
    try {
      const domResult = view.domAtPos(block.pos + 1);
      let el: Node | null = domResult.node;
      while (el && el.nodeType !== Node.ELEMENT_NODE) el = el.parentNode;
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
      // measurement failed — use 0
    }

    measured.push({
      pos: block.pos,
      heightPx: domNode
        ? Math.round(domNode.getBoundingClientRect().height / scale)
        : 0,
      isSpacer: false,
    });
  }

  // ── Step 3: determine where spacers should go ─────────────────────
  type SpacerSpec = { afterPos: number; pageIndex: number; };
  const neededSpacers: SpacerSpec[] = [];
  let accumulatedPx = 0;
  let pageIndex = 0;

  for (const block of measured) {
    if (block.isSpacer) continue;
    const blockH = block.heightPx;

    console.log("BLOCK", {
      pos: block.pos,
      heightPx: blockH,
      accumulatedBefore: accumulatedPx,
      accumulatedAfter: accumulatedPx + blockH,
      usableHeightPx,
      wouldOverflow: accumulatedPx + blockH > usableHeightPx,
    });

    if (accumulatedPx + blockH > usableHeightPx && accumulatedPx > 0) {
      neededSpacers.push({ afterPos: block.pos, pageIndex });
      pageIndex++;
      accumulatedPx = blockH;
    } else {
      accumulatedPx += blockH;
      if (blockH > usableHeightPx) {
        const extraPages = Math.floor(blockH / usableHeightPx);
        for (let p = 0; p < extraPages; p++) {
          neededSpacers.push({ afterPos: block.pos, pageIndex });
          pageIndex++;
        }
        accumulatedPx = blockH % usableHeightPx;
      }
    }
  }

  // ── Step 4: diff — skip if already correct ────────────────────────
  const existingSpacers = measured.filter((b) => b.isSpacer);
  const alreadyCorrect =
    existingSpacers.length === neededSpacers.length &&
    existingSpacers.every((sp, i) => {
      const heightOk = Math.abs((sp.existingSpacerHeight ?? 0) - spacerHeightPx) < 1;
      return sp.existingSpacerPageIndex === neededSpacers[i]?.pageIndex && heightOk;
    });

  if (alreadyCorrect) return;

  // ── Step 5: remove old spacers ────────────────────────────────────
  let tr = state.tr;
  const spacerPositions: number[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name === PAGE_BREAK_SPACER_TYPE) spacerPositions.push(offset);
  });
  for (let i = spacerPositions.length - 1; i >= 0; i--) {
    const pos = spacerPositions[i];
    tr = tr.delete(pos, pos + doc.nodeAt(pos)!.nodeSize);
  }
  const stateAfterDelete = state.apply(tr);

  // ── Step 6: insert new spacers ────────────────────────────────────
  // Map needed spacers from original block positions to block indices
  const nonSpacerPositions: number[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name !== PAGE_BREAK_SPACER_TYPE) nonSpacerPositions.push(offset);
  });

  const insertions: Array<{ blockIndex: number; pageIndex: number }> = [];
  for (const spec of neededSpacers) {
    const blockIdx = nonSpacerPositions.indexOf(spec.afterPos);
    if (blockIdx >= 0) insertions.push({ blockIndex: blockIdx, pageIndex: spec.pageIndex });
  }
  insertions.sort((a, b) => b.blockIndex - a.blockIndex);

  // Find positions in the post-delete doc
  const postDeletePositions: number[] = [];
  stateAfterDelete.doc.forEach((_, offset) => postDeletePositions.push(offset));

  let insertTr = stateAfterDelete.tr;
  for (const ins of insertions) {
    const insertPos = postDeletePositions[ins.blockIndex];
    if (insertPos === undefined) continue;
    const spacerNode = stateAfterDelete.schema.nodes[PAGE_BREAK_SPACER_TYPE].create({
      height: spacerHeightPx,
      pageIndex: ins.pageIndex,
    });
    insertTr = insertTr.insert(insertPos, spacerNode);
  }

  insertTr.setMeta("addToHistory", false);
  insertTr.setMeta("pagination", true);
  editor.view.dispatch(insertTr);
}