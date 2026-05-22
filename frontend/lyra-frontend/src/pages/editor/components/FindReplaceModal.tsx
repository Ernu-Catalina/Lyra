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
  /**
   * Incremented by Editor.page.tsx each time a scene's content is freshly
   * loaded from the API. Including this in the useEffect deps lets us detect
   * when editor.state.doc has been updated with the new scene's content so we
   * can apply the correct ProseMirror selection after a cross-scene jump.
   */
  sceneContentKey?: number;
  onNavigateScene?: (target: {
    chapterId: string;
    sceneId: string;
    matchIndexInScene: number;
    matchIndex: number;
  }) => void;
  /**
   * Callback to update multiple scenes at once (for Replace All across chapters/documents).
   * Maps sceneId to new content. Parent should update outline and trigger autosave.
   */
  onUpdateScenes?: (sceneUpdates: Record<string, string>) => void;
}

/** Stored while a cross-scene navigation is in flight */
interface PendingMatch {
  /** 0-based index into the global matchLocations array */
  normalizedIndex: number;
  /** 0-based occurrence of this match within the target scene */
  matchIndexInScene: number;
  /** sceneId we are navigating to */
  targetSceneId: string;
  /** value of sceneContentKey at the moment navigation was triggered */
  sceneContentKeyAtNav: number;
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
  sceneContentKey,
  onNavigateScene,
  onUpdateScenes,
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

  /**
   * Non-null while a cross-scene navigation is in flight. Cleared once the
   * target scene's content has loaded and the match has been selected.
   */
  const pendingMatchRef = useRef<PendingMatch | null>(null);

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
      pendingMatchRef.current = null;

      if (viewType === "scene" && editor) {
        try {
          if ((editor as any).storage?.searchAndReplace) {
            (editor as any).storage.searchAndReplace.searchTerm = "";
            (editor as any).storage.searchAndReplace.matches = [];
            editor.view.dispatch(editor.state.tr);
          }
        } catch {
          // ignore
        }
      } else if (viewType === "chapter" || viewType === "document") {
        const container = document.querySelector(".page-container");
        searchAndReplaceUtils.clearHighlights(container as HTMLElement);
      }

      return;
    }

    const outlineMatches = outline
      ? searchAndReplaceUtils.findMatchesInOutline(outline, findText, caseSensitive, wholeWords)
      : [];

    if (viewType === "scene" && editor) {
      const pending = pendingMatchRef.current;

      // If a cross-scene navigation is in flight and the API content hasn't
      // arrived yet, editor.state.doc still has the old scene's text. Updating
      // matchLocations with that stale data would corrupt Next/Prev navigation.
      // Skip everything except preserving the counter and wait for the next
      // effect run (triggered by sceneContentKey incrementing).
      const isContentStale =
        pending !== null &&
        activeSceneId === pending.targetSceneId &&
        (sceneContentKey ?? 0) <= pending.sceneContentKeyAtNav;

      if (isContentStale) {
        setCurrentMatch(pending.normalizedIndex + 1);
        return;
      }

      // --- Build live matches from the actual editor document ---
      const sceneMatches = searchAndReplaceUtils.findMatchesInDoc(
        editor.state.doc,
        findText,
        caseSensitive,
        wholeWords
      );

      const currentChapterIndex = outline?.chapters.findIndex((c) => c.id === activeChapterId) ?? 0;
      const currentSceneIndex =
        outline?.chapters[currentChapterIndex]?.scenes.findIndex((s) => s.id === activeSceneId) ?? 0;

      const liveSceneMatches: OutlineSearchMatch[] = sceneMatches.map((match, matchIndexInScene) => ({
        chapterId: activeChapterId ?? "",
        sceneId: activeSceneId ?? "",
        chapterIndex: currentChapterIndex,
        sceneIndex: currentSceneIndex,
        from: match.start,
        to: match.end,
        text: match.text,
        matchIndexInScene,
      }));

      const otherMatches = outlineMatches.filter(
        (match) => !(match.chapterId === activeChapterId && match.sceneId === activeSceneId)
      );

      const allMatches = [...otherMatches, ...liveSceneMatches].sort((a, b) => {
        const chapterDiff = a.chapterIndex - b.chapterIndex;
        if (chapterDiff !== 0) return chapterDiff;
        const sceneDiff = a.sceneIndex - b.sceneIndex;
        if (sceneDiff !== 0) return sceneDiff;
        return a.from - b.from;
      });

      setMatchLocations(allMatches);
      setMatchCount(allMatches.length);

      // Update TipTap decoration storage
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

      // ── Determine currentMatch, applying cross-scene navigation intent ─
      if (pending !== null) {
        // Content is now fresh (isContentStale was false) — select the target match
        const targetLiveMatch = liveSceneMatches[pending.matchIndexInScene];
        if (targetLiveMatch) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: targetLiveMatch.from, to: targetLiveMatch.to })
            .run();
        }
        setCurrentMatch(pending.normalizedIndex + 1);
        pendingMatchRef.current = null;
      } else {
        setCurrentMatch(allMatches.length > 0 ? 1 : 0);
      }
    } else if (viewType === "chapter") {
      const container = document.querySelector(".page-container");
      const chapterStartIndex = outlineMatches.findIndex(
        (match) => match.chapterId === activeChapterId
      );
      const visibleStartIndex = chapterStartIndex >= 0 ? chapterStartIndex : 0;

      const count = searchAndReplaceUtils.highlightMatches(
        container as HTMLElement,
        findText,
        caseSensitive,
        wholeWords,
        visibleStartIndex
      );
      setMatchLocations(outlineMatches);
      setMatchCount(outlineMatches.length);
      setCurrentMatch(count > 0 ? visibleStartIndex + 1 : outlineMatches.length > 0 ? 1 : 0);
      if (count > 0) {
        searchAndReplaceUtils.scrollToMatch(container as HTMLElement, visibleStartIndex);
      }
    } else if (viewType === "document") {
      const container = document.querySelector(".page-container");
      const count = searchAndReplaceUtils.highlightMatches(
        container as HTMLElement,
        findText,
        caseSensitive,
        wholeWords,
        0
      );
      setMatchLocations(outlineMatches);
      setMatchCount(outlineMatches.length);
      setCurrentMatch(outlineMatches.length > 0 ? 1 : 0);
      if (count > 0) {
        searchAndReplaceUtils.scrollToMatch(container as HTMLElement, 0);
      }
    }
  }, [
    findText,
    caseSensitive,
    wholeWords,
    isOpen,
    editor,
    viewType,
    chapter,
    outline,
    activeChapterId,
    activeSceneId,
    sceneContentKey,
  ]);

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
        // Store navigation intent so the useEffect can restore the counter
        // and select the correct match once the new scene's content loads.
        pendingMatchRef.current = {
          normalizedIndex: normalized,
          matchIndexInScene: targetMatch.matchIndexInScene,
          targetSceneId: targetMatch.sceneId,
          sceneContentKeyAtNav: sceneContentKey ?? 0,
        };
        onNavigateScene?.({
          chapterId: targetMatch.chapterId,
          sceneId: targetMatch.sceneId,
          matchIndexInScene: targetMatch.matchIndexInScene,
          matchIndex: normalized + 1,
        });
      }
    } else if (viewType === "chapter") {
      if (targetMatch.chapterId !== activeChapterId) {
        onNavigateScene?.({
          chapterId: targetMatch.chapterId,
          sceneId: targetMatch.sceneId,
          matchIndexInScene: targetMatch.matchIndexInScene,
          matchIndex: normalized + 1,
        });
        return;
      }

      const container = document.querySelector(".page-container");
      const node = searchAndReplaceUtils.scrollToMatch(container as HTMLElement, normalized);
      if (!node) {
        onNavigateScene?.({
          chapterId: targetMatch.chapterId,
          sceneId: targetMatch.sceneId,
          matchIndexInScene: targetMatch.matchIndexInScene,
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
    if (!findText || matchLocations.length === 0 || currentMatch <= 0) return;

    const currentMatchObj = matchLocations[currentMatch - 1];
    if (!currentMatchObj) return;

    if (viewType === "scene" && editor) {
      // Scene view: use TipTap editor for safe replacement with formatting preservation
      const success = searchAndReplaceUtils.replaceSingleMatch(
        editor,
        currentMatchObj.from,
        currentMatchObj.to,
        replaceText
      );

      if (success) {
        // Stay on current match — user controls navigation with Previous/Next buttons
        // This prevents unintended scene switches during editing
      }
    } else if (viewType === "chapter" || viewType === "document") {
      // Chapter/Document view: update scene content in outline
      if (!outline) return;

      const chapter = outline.chapters.find((c) => c.id === currentMatchObj.chapterId);
      const scene = chapter?.scenes.find((s) => s.id === currentMatchObj.sceneId);
      if (!scene) return;

      // Replace in the scene's content string (fall back to empty string)
      const orig = scene.content || "";
      const newContent = orig.substring(0, currentMatchObj.from) + replaceText + orig.substring(currentMatchObj.to);

      // Notify parent to update outline and trigger autosave
      onUpdateScenes?.({
        [currentMatchObj.sceneId]: newContent,
      });

      // Stay on current match — user controls navigation
    }
  };

  const handleReplaceAll = () => {
    if (!findText || matchLocations.length === 0) return;

    if (viewType === "scene" && editor) {
      // Scene view: use TipTap's transaction API to preserve formatting
      const success = searchAndReplaceUtils.replaceAllMatchesOptimized(
        editor,
        findText,
        replaceText,
        caseSensitive,
        wholeWords
      );

      if (success) {
        // Clear find/replace state after successful replacement
        setFindText("");
        setReplaceText("");
        setCurrentMatch(0);
        setMatchCount(0);
      }
    } else if (viewType === "chapter" || viewType === "document") {
      // Chapter/Document view: update all matching scenes in outline
      if (!outline) return;

      // Determine scope: current chapter or all chapters
      const scopedMatches =
        viewType === "chapter"
          ? matchLocations.filter((m) => m.chapterId === activeChapterId)
          : matchLocations;

      if (scopedMatches.length === 0) return;

      // Group matches by scene and replace in each scene's content.
      // Process matches per scene in reverse order (descending `from`) to avoid offset shifts.
      const matchesByScene: Record<string, OutlineSearchMatch[]> = {};
      scopedMatches.forEach((m) => {
        matchesByScene[m.sceneId] = matchesByScene[m.sceneId] || [];
        matchesByScene[m.sceneId].push(m);
      });

      const sceneUpdates: Record<string, string> = {};
      Object.entries(matchesByScene).forEach(([sceneId, matches]) => {
        const chapter = outline.chapters.find((c) => c.scenes.some((s) => s.id === sceneId));
        const scene = chapter?.scenes.find((s) => s.id === sceneId);
        if (!scene) return;

        // Start from original scene content (ensure string)
        const original = scene.content || "";
        let updated = original;

        // Sort matches in reverse order and apply replacements
        matches
          .slice()
          .sort((a, b) => b.from - a.from)
          .forEach((match) => {
            updated = updated.substring(0, match.from) + replaceText + updated.substring(match.to);
          });

        sceneUpdates[sceneId] = updated;
      });

      // Update all affected scenes via callback
      onUpdateScenes?.(sceneUpdates);

      // Clear highlights and reset state after replacement
      const container = document.querySelector(".page-container");
      searchAndReplaceUtils.clearHighlights(container as HTMLElement);
      setFindText("");
      setReplaceText("");
      setCurrentMatch(0);
      setMatchCount(0);
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
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
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
              type="button"
              onClick={handleFindPrev}
              disabled={matchCount === 0}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded transition-colors text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Find Previous"
            >
              <ChevronUp size={18} />
            </button>
            <button
              type="button"
              onClick={handleFindNext}
              disabled={matchCount === 0}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded transition-colors text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Find Next"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          </div>

          {/* Replace Input (available for scene/chapter/document views) */}
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
              type="button"
              onClick={handleReplace}
              disabled={matchCount === 0}
              className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleReplaceAll}
              disabled={matchCount === 0}
              className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Replace All
            </button>
          </div>

          {/* View Type Indicator */}
          <div className="text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
            {viewType === "scene" && (
              <span>Editing scene • Replace available</span>
            )}
            {viewType === "chapter" && (
              <span>Viewing chapter • Replace available (all scenes in chapter)</span>
            )}
            {viewType === "document" && (
              <span>Viewing entire document • Replace available (all scenes)</span>
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
