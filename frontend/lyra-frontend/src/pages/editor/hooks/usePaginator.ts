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
        if (!editor) return;
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

  const marginTopPx     = mmToPx(convertToMm(settings.marginTop,    settings.marginUnit));
  const marginBottomPx  = mmToPx(convertToMm(settings.marginBottom, settings.marginUnit));
  const pageHeightPx    = mmToPx(paperSize.height);
  const usableHeightPx  = pageHeightPx - marginTopPx - marginBottomPx;
  const GAP_PX          = 24;
  const spacerHeightPx  = marginBottomPx + GAP_PX + marginTopPx;

  const SAFETY_BUFFER_PX = 8;

  const doc = editor.state.doc;
  const view = editor.view;

  // ── Step 1: Collect top-level blocks ──────────────────────────────
  type BlockEntry = { pos: number; node: any; isSpacer: boolean; };
  const blocks: BlockEntry[] = [];
  doc.forEach((node, offset) => {
    blocks.push({ pos: offset, node, isSpacer: node.type.name === PAGE_BREAK_SPACER_TYPE });
  });

  // ── Step 2: Measure non-spacer blocks ─────────────────────────────
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
      while (el && el.parentElement && el.parentElement !== view.dom) el = el.parentElement;
      domNode = el as HTMLElement;
    } catch {}

    measured.push({
      pos: block.pos,
      heightPx: domNode ? Math.round(domNode.offsetHeight) : 0,
      isSpacer: false,
    });
  }

  // ── Step 3: Stricter pagination logic ─────────────────────────────
  type SpacerSpec = { afterPos: number; pageIndex: number; };
  const neededSpacers: SpacerSpec[] = [];
  let accumulatedPx = 0;
  let pageIndex = 0;

  for (const block of measured) {
    if (block.isSpacer) continue;

    const blockH = block.heightPx;

    // Reserve bottom margin + safety buffer before breaking
    if (accumulatedPx + blockH > usableHeightPx - marginBottomPx - SAFETY_BUFFER_PX && accumulatedPx > 0) {
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

  // ── Step 4: Diff — skip if already correct ────────────────────────
  const existingSpacers = measured.filter((b) => b.isSpacer);
  const alreadyCorrect =
    existingSpacers.length === neededSpacers.length &&
    existingSpacers.every((sp, i) => {
      const needed = neededSpacers[i];
      return (
        sp.existingSpacerPageIndex === needed?.pageIndex &&
        Math.abs((sp.existingSpacerHeight ?? 0) - spacerHeightPx) < 2
      );
    });

  if (alreadyCorrect) return;

  // ── Step 5: Remove old spacers ────────────────────────────────────
  let tr = editor.state.tr;
  const spacerPositions: number[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name === PAGE_BREAK_SPACER_TYPE) spacerPositions.push(offset);
  });

  for (let i = spacerPositions.length - 1; i >= 0; i--) {
    const pos = spacerPositions[i];
    tr = tr.delete(pos, pos + doc.nodeAt(pos)!.nodeSize);
  }

  const stateAfterDelete = editor.state.apply(tr);
  let insertTr = stateAfterDelete.tr;

  // ── Step 6: Build insertions using ORIGINAL positions (before delete) ──
  const originalNonSpacerPositions: number[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name !== PAGE_BREAK_SPACER_TYPE) {
      originalNonSpacerPositions.push(offset);
    }
  });

  const insertions = neededSpacers
    .map(spec => {
      const blockIdx = originalNonSpacerPositions.indexOf(spec.afterPos);
      return blockIdx >= 0 ? { blockIndex: blockIdx, pageIndex: spec.pageIndex } : null;
    })
    .filter((ins): ins is { blockIndex: number; pageIndex: number } => ins !== null);

  insertions.sort((a, b) => b.blockIndex - a.blockIndex);

  // Get positions in the post-delete document
  const postDeletePositions: number[] = [];
  stateAfterDelete.doc.forEach((_, offset) => postDeletePositions.push(offset));

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