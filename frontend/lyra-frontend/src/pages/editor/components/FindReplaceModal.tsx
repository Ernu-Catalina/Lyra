import React, { useState, useRef, useEffect } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { Editor } from "@tiptap/react";
import { searchAndReplaceUtils } from "../extensions/SearchAndReplace";

interface FindReplaceModalProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  viewType: "scene" | "chapter" | "document";
}

export function FindReplaceModal({
  editor,
  isOpen,
  onClose,
  viewType,
}: FindReplaceModalProps) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus find input when modal opens
  useEffect(() => {
    if (isOpen && findInputRef.current) {
      findInputRef.current.focus();
      findInputRef.current.select();
    }
  }, [isOpen]);

  // Update match count and highlighting when search changes
  useEffect(() => {
    if (!isOpen || !findText) {
      setMatchCount(0);
      setCurrentMatch(0);
      if (editor && viewType === "scene") {
        try {
          if ((editor as any).storage?.searchAndReplace) {
            (editor as any).storage.searchAndReplace.searchTerm = "";
            (editor as any).storage.searchAndReplace.matches = [];
            editor.view.dispatch(editor.state.tr);
          }
        } catch (e) {
          // ignore
        }
        editor.chain().focus().run();
      } else if (viewType === "chapter" || viewType === "document") {
        const container = document.querySelector(".page-container");
        searchAndReplaceUtils.clearHighlights(container as HTMLElement);
      }
      return;
    }

    if (viewType === "scene" && editor) {
      // For scene editor, compute matches inside the ProseMirror doc and set extension storage so
      // the SearchAndReplace plugin can decorate them.
      const matches = searchAndReplaceUtils.findMatchesInDoc(
        editor.state.doc,
        findText,
        caseSensitive,
        wholeWords
      );

      setMatchCount(matches.length);
      setCurrentMatch(matches.length > 0 ? 1 : 0);

      // Update extension storage (if available) so plugin decorations update
      try {
        if ((editor as any).storage && (editor as any).storage.searchAndReplace) {
          (editor as any).storage.searchAndReplace.searchTerm = findText;
          (editor as any).storage.searchAndReplace.caseSensitive = caseSensitive;
          (editor as any).storage.searchAndReplace.wholeWords = wholeWords;
          (editor as any).storage.searchAndReplace.matches = matches.map((m: any) => ({ from: m.start, to: m.end, text: m.text }));
          // Trigger a no-op transaction to make plugin re-evaluate decorations
          editor.view.dispatch(editor.state.tr);
        }
      } catch (e) {
        // ignore
      }
    } else {
      // For chapter/document views, highlight in DOM
      const container = document.querySelector(".page-container");
      const count = searchAndReplaceUtils.highlightMatches(
        container as HTMLElement,
        findText,
        caseSensitive,
        wholeWords
      );
      setMatchCount(count);
      setCurrentMatch(count > 0 ? 1 : 0);
    }
  }, [findText, caseSensitive, wholeWords, isOpen, editor, viewType]);

  const handleFindNext = () => {
    if (!findText || matchCount === 0) return;

    if (viewType === "scene" && editor) {
      // Move to next match in TipTap editor
      const currentContent = editor.state.doc.textContent;
      const matches = searchAndReplaceUtils.findMatches(
        currentContent,
        findText,
        caseSensitive,
        wholeWords
      );

      if (matches.length === 0) return;

      // Find the next match after current selection
      const { from } = editor.state.selection;
      const nextMatch = matches.find((m) => m.start >= from);
      const matchToSelect = nextMatch || matches[0];

      editor
        .chain()
        .focus()
        .setTextSelection({ from: matchToSelect.start, to: matchToSelect.end })
        .run();

      setCurrentMatch((matches.indexOf(matchToSelect) + 1) % matches.length);
    }
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
      // Shift+Enter to find previous (using arrow up)
      e.preventDefault();
      handleFindNext(); // For now, same as find next
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
        className="fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
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
            <button
              onClick={handleFindNext}
              disabled={matchCount === 0}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded transition-colors text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Find Next (Enter)"
            >
              <ChevronDown size={18} />
            </button>
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
        .search-highlight {
          background-color: #ffd700;
          padding: 2px 0;
        }
        .search-highlight-dom {
          background-color: #ffd700;
          padding: 2px 0;
        }
      `}</style>
    </>
  );
}
