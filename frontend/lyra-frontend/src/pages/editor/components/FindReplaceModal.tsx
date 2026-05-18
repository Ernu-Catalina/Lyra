import React, { useState, useRef, useEffect } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { Editor } from "@tiptap/react";
import { searchAndReplaceUtils, type OutlineSearchMatch } from "../extensions/SearchAndReplace";
import type { DocumentOutline, Chapter } from "../../../types/document";

interface FindReplaceModalProps {
  editor: Editor | null;
  outline?: DocumentOutline | null;
  chapter?: Chapter | null;
  activeChapterId?: string | null;
  activeSceneId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  viewType: "scene" | "chapter" | "document";
  onNavigateScene?: (target: {
    chapterId: string;
    sceneId: string;
    from: number;
    to: number;
    matchIndex: number;
  }) => void;
}

export function FindReplaceModal({
  editor,
  outline,
  chapter,
  activeChapterId,
  activeSceneId,
  isOpen,
  onClose,
  viewType,
  onNavigateScene,
}: FindReplaceModalProps) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matchLocations, setMatchLocations] = useState<OutlineSearchMatch[]>([]);
  const [dragPosition, setDragPosition] = useState({ left: 0, top: 80 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus find input when modal opens
  useEffect(() => {
    if (isOpen) {
      const centerX = Math.max(16, window.innerWidth / 2 - 280);
      setDragPosition({ left: centerX, top: 80 });
      setTimeout(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }, 0);
    }
  }, [isOpen]);

  // Update match count and highlighting when search changes
  useEffect(() => {
    if (!isOpen || !findText) {
      setMatchCount(0);
      setCurrentMatch(0);
      setMatchLocations([]);

      if (editor && viewType === "scene") {
        try {
          if ((editor as any).storage?.searchAndReplace) {
            (editor as any).storage.searchAndReplace.searchTerm = "";
            (editor as any).storage.searchAndReplace.matches = [];
            editor.view.dispatch(editor.state.tr);
          }
        } catch {
          // ignore
        }
        editor.chain().focus().run();
      } else if (viewType === "chapter" || viewType === "document") {
        const container = document.querySelector(".page-container");
        searchAndReplaceUtils.clearHighlights(container as HTMLElement);
      }

      return;
    }

    const chapterIndex = outline?.chapters.findIndex((c) => c.id === chapter?.id) ?? 0;
    const chapterMatches = chapter
      ? searchAndReplaceUtils.findMatchesInChapter(chapter, chapterIndex, findText, caseSensitive, wholeWords)
      : [];
    const documentMatches = outline
      ? searchAndReplaceUtils.findMatchesInOutline(outline, findText, caseSensitive, wholeWords)
      : [];

    if (viewType === "scene" && editor) {
      const sceneMatches = searchAndReplaceUtils.findMatchesInDoc(
        editor.state.doc,
        findText,
        caseSensitive,
        wholeWords
      );

      setMatchLocations(
        documentMatches.length > 0 ? documentMatches : sceneMatches.map((match) => ({
          chapterId: activeChapterId ?? "",
          sceneId: activeSceneId ?? "",
          chapterIndex: 0,
          sceneIndex: 0,
          from: match.start,
          to: match.end,
          text: match.text,
        }))
      );
      setMatchCount(documentMatches.length > 0 ? documentMatches.length : sceneMatches.length);
      setCurrentMatch(documentMatches.length > 0 || sceneMatches.length > 0 ? 1 : 0);

      try {
        if ((editor as any).storage?.searchAndReplace) {
          (editor as any).storage.searchAndReplace.searchTerm = findText;
          (editor as any).storage.searchAndReplace.caseSensitive = caseSensitive;
          (editor as any).storage.searchAndReplace.wholeWords = wholeWords;
          (editor as any).storage.searchAndReplace.matches = sceneMatches.map((m: any) => ({
            from: m.start,
            to: m.end,
            text: m.text,
          }));
          editor.view.dispatch(editor.state.tr);
        }
      } catch {
        // ignore
      }
    } else if (viewType === "chapter") {
      const container = document.querySelector(".page-container");
      const count = searchAndReplaceUtils.highlightMatches(
        container as HTMLElement,
        findText,
        caseSensitive,
        wholeWords
      );
      setMatchLocations(chapterMatches);
      setMatchCount(count);
      setCurrentMatch(count > 0 ? 1 : 0);
      if (count > 0) {
        searchAndReplaceUtils.scrollToMatch(container as HTMLElement, 0);
      }
    } else if (viewType === "document") {
      const container = document.querySelector(".page-container");
      const count = searchAndReplaceUtils.highlightMatches(
        container as HTMLElement,
        findText,
        caseSensitive,
        wholeWords
      );
      setMatchLocations(documentMatches);
      setMatchCount(count);
      setCurrentMatch(count > 0 ? 1 : 0);
      if (count > 0) {
        searchAndReplaceUtils.scrollToMatch(container as HTMLElement, 0);
      }
    }
  }, [findText, caseSensitive, wholeWords, isOpen, editor, viewType, chapter, outline, activeChapterId, activeSceneId]);

  const scrollToCurrentMatch = (index: number) => {
    const container = document.querySelector(".page-container");
    if (!container || matchLocations.length === 0) return;
    searchAndReplaceUtils.scrollToMatch(container as HTMLElement, index);
  };

  const goToMatchIndex = (targetIndex: number) => {
    if (matchLocations.length === 0) return;
    const normalized = (targetIndex + matchLocations.length) % matchLocations.length;
    const targetMatch = matchLocations[normalized];
    setCurrentMatch(normalized + 1);

    if (viewType === "scene" && editor) {
      const isCurrentScene =
        targetMatch.chapterId === activeChapterId &&
        targetMatch.sceneId === activeSceneId;

      if (isCurrentScene) {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: targetMatch.from, to: targetMatch.to })
          .run();
      } else {
        onNavigateScene?.({
          chapterId: targetMatch.chapterId,
          sceneId: targetMatch.sceneId,
          from: targetMatch.from,
          to: targetMatch.to,
          matchIndex: normalized + 1,
        });
      }
    } else {
      scrollToCurrentMatch(normalized);
    }
  };

  const handleFindNext = () => {
    if (!findText || matchCount === 0) return;
    goToMatchIndex(currentMatch);
  };

  const handleFindPrev = () => {
    if (!findText || matchCount === 0) return;
    goToMatchIndex(currentMatch - 2);
  };

  const handleReplace = () => {
    if (!findText || !editor || viewType !== "scene") return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textContent.substring(from, to);

    // Check if selected text matches find text
    const matches = caseSensitive
      ? selectedText === findText
      : selectedText.toLowerCase() === findText.toLowerCase();

    if (matches) {
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(replaceText)
        .run();

      // Move to next match
      handleFindNext();
    }
  };

  const handleReplaceAll = () => {
    if (!findText) return;

    if (viewType === "scene" && editor) {
      // Replace all in TipTap editor
      const content = editor.state.doc.textContent;
      const matches = searchAndReplaceUtils.findMatches(
        content,
        findText,
        caseSensitive,
        wholeWords
      );

      if (matches.length === 0) return;

      // Build replacement content
      let newContent = content;
      let offset = 0;

      matches.forEach(({ start, end }) => {
        newContent =
          newContent.substring(0, start + offset) +
          replaceText +
          newContent.substring(end + offset);
        offset += replaceText.length - (end - start);
      });

      editor
        .chain()
        .focus()
        .selectAll()
        .insertContent(newContent, { parseOptions: { preserveWhitespace: false } })
        .run();

      setFindText("");
      setReplaceText("");
      setCurrentMatch(0);
      setMatchCount(0);
    } else {
      // For read-only views, show message
      alert(
        `Replace All works only in Scene Editor. You're viewing ${viewType === "chapter" ? "a chapter" : "the entire document"} in read-only mode.`
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleFindPrev();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleFindNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed z-40 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-2xl w-[min(95vw,520px)]"
        style={{
          left: dragPosition.left,
          top: dragPosition.top,
          transform: "none",
        }}
      >
        <div
          className="flex items-center justify-between p-4 border-b border-[var(--border)] cursor-grab select-none"
          onPointerDown={(e) => {
            setDragOffset({
              x: e.clientX - dragPosition.left,
              y: e.clientY - dragPosition.top,
            });
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragOffset) return;
            setDragPosition({
              left: Math.max(12, Math.min(e.clientX - dragOffset.x, window.innerWidth - 540)),
              top: Math.max(12, Math.min(e.clientY - dragOffset.y, window.innerHeight - 120)),
            });
          }}
          onPointerUp={() => setDragOffset(null)}
          onPointerCancel={() => setDragOffset(null)}
        >
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Find & Replace
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-primary)] rounded transition-colors text-[var(--text-secondary)]"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Find Input */}
          <div className="flex gap-2 items-center">
            <label className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
              Find
            </label>
            <input
              ref={findInputRef}
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Find text..."
              className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
            />
            <div className="text-sm text-[var(--text-secondary)]">
              {matchCount > 0 && (
                <span>
                  {currentMatch} of {matchCount}
                </span>
              )}
              {matchCount === 0 && findText && (
                <span className="text-red-500">No matches</span>
              )}
            </div>
            <div className="flex gap-1 items-center">
            <button
              onClick={handleFindPrev}
              disabled={matchCount === 0}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded transition-colors text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Find Previous"
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={handleFindNext}
              disabled={matchCount === 0}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded transition-colors text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Find Next"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          </div>

          {/* Replace Input (Scene Editor only) */}
          {viewType === "scene" && (
            <div className="flex gap-2 items-center">
              <label className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                Replace
              </label>
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Replace with..."
                className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
              />
            </div>
          )}

          {/* Options */}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-[var(--bg-primary)] px-2 py-1 rounded">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-[var(--text-secondary)]">Case sensitive</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-[var(--bg-primary)] px-2 py-1 rounded">
              <input
                type="checkbox"
                checked={wholeWords}
                onChange={(e) => setWholeWords(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-[var(--text-secondary)]">Whole words</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              Close
            </button>
            {viewType === "scene" && (
              <>
                <button
                  onClick={handleReplace}
                  disabled={matchCount === 0}
                  className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={matchCount === 0}
                  className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Replace All
                </button>
              </>
            )}
          </div>

          {/* View Type Indicator */}
          <div className="text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
            {viewType === "scene" && (
              <span>Editing scene • Replace available</span>
            )}
            {viewType === "chapter" && (
              <span>Viewing chapter (read-only) • Find only</span>
            )}
            {viewType === "document" && (
              <span>Viewing entire document (read-only) • Find only</span>
            )}
          </div>
        </div>
      </div>

      {/* CSS for highlighting */}
      <style>{`
        .search-highlight,
        .search-highlight-dom {
          background-color: var(--search-highlight);
          color: inherit;
        }

        .search-highlight-current {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}
