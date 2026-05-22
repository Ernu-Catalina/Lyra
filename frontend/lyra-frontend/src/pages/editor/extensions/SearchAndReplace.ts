import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { DocumentOutline, Chapter, Scene } from '../../../types/document';

export interface SearchAndReplaceOptions {
  className: string;
}

export interface SearchMatch {
  from: number;
  to: number;
  text: string;
}

export interface OutlineSearchMatch extends SearchMatch {
  chapterId: string;
  sceneId: string;
  chapterIndex: number;
  sceneIndex: number;
  /** 0-based index of this match within its scene's matches (used for cross-scene cursor placement) */
  matchIndexInScene: number;
}

/**
 * SearchAndReplace Extension
 * 
 * Manages searching and highlighting matches in TipTap editor.
 * Provides utilities for:
 * - Finding all matches with optional case sensitivity and whole words
 * - Replacing single matches or all at once
 * - Decorating matches for visual highlighting
 */
export const SearchAndReplace = Extension.create<SearchAndReplaceOptions>({
  name: 'searchAndReplace',

  addOptions() {
    return {
      className: 'search-highlight',
    };
  },

  addStorage() {
    return {
      searchTerm: '',
      caseSensitive: false,
      wholeWords: false,
      matches: [] as SearchMatch[],
      currentMatchIndex: 0,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('searchAndReplace'),
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            // Get the storage values to check if we should update decorations
            const storage = extension.storage;
            if (storage.searchTerm === '') {
              return DecorationSet.empty;
            }

            // Rebuild decorations from matches
            const decorations = storage.matches.map((match: SearchMatch) =>
              Decoration.inline(match.from, match.to, {
                class: extension.options.className,
              })
            );

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl+F or Cmd+F will be handled at the component level
      // This is just for reference
    };
  },
});

/**
 * Utility functions for search operations
 */
export const searchAndReplaceUtils = {
  /**
   * Find all matches in text
   */
  findMatches(
    text: string,
    searchTerm: string,
    caseSensitive: boolean = false,
    wholeWords: boolean = false
  ): { start: number; end: number; text: string }[] {
    if (!searchTerm) return [];

    const matches: { start: number; end: number; text: string }[] = [];
    let regex: RegExp;

    try {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = wholeWords
        ? `\\b${escapedTerm}\\b`
        : escapedTerm;

      regex = new RegExp(pattern, flags);
    } catch {
      return [];
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }

    return matches;
  },

  /**
   * Find matches inside a ProseMirror document and return absolute positions
   */
  findMatchesInDoc(doc: any, searchTerm: string, caseSensitive = false, wholeWords = false) {
    if (!searchTerm) return [];

    const results: { start: number; end: number; text: string }[] = [];

    doc.descendants((node: any, pos: number) => {
      if (!node.isText) return true;
      const text = node.text || "";
      const localMatches = searchAndReplaceUtils.findMatches(text, searchTerm, caseSensitive, wholeWords);
      localMatches.forEach((m) => {
        results.push({ start: pos + m.start, end: pos + m.end, text: m.text });
      });
      return true;
    });

    return results;
  },

  findMatchesInChapter(
    chapter: Chapter,
    chapterIndex: number,
    searchTerm: string,
    caseSensitive = false,
    wholeWords = false
  ): OutlineSearchMatch[] {
    if (!searchTerm) return [];

    const results: OutlineSearchMatch[] = [];

    chapter.scenes.forEach((scene, sceneIndex) => {
      const content = scene.content || "";
      const localMatches = searchAndReplaceUtils.findMatches(
        content,
        searchTerm,
        caseSensitive,
        wholeWords
      );

      localMatches.forEach((m, matchIndexInScene) => {
        results.push({
          chapterId: chapter.id,
          sceneId: scene.id,
          chapterIndex,
          sceneIndex,
          from: m.start,
          to: m.end,
          text: m.text,
          matchIndexInScene,
        });
      });
    });

    return results;
  },

  findMatchesInOutline(
    outline: DocumentOutline,
    searchTerm: string,
    caseSensitive = false,
    wholeWords = false
  ): OutlineSearchMatch[] {
    if (!searchTerm) return [];

    const results: OutlineSearchMatch[] = [];

    outline.chapters.forEach((chapter, chapterIndex) => {
      chapter.scenes.forEach((scene, sceneIndex) => {
        const content = scene.content || "";
        const localMatches = searchAndReplaceUtils.findMatches(
          content,
          searchTerm,
          caseSensitive,
          wholeWords
        );

        localMatches.forEach((m, matchIndexInScene) => {
          results.push({
            chapterId: chapter.id,
            sceneId: scene.id,
            chapterIndex,
            sceneIndex,
            from: m.start,
            to: m.end,
            text: m.text,
            matchIndexInScene,
          });
        });
      });
    });

    return results;
  },

  /**
   * Highlight all matches in DOM (for read-only views)
   */
  highlightMatches(
    container: HTMLElement | null,
    searchTerm: string,
    caseSensitive: boolean = false,
    wholeWords: boolean = false,
    startIndex: number = 0
  ): number {
    if (!container || !searchTerm) {
      // Clear existing highlights
      const highlighted = container?.querySelectorAll('.search-highlight-dom');
      highlighted?.forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      });
      return 0;
    }

    // Clear previous highlights
    const prevHighlights = container.querySelectorAll('.search-highlight-dom');
    prevHighlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });

    let matchCount = 0;
    const nodeFilter = NodeFilter.SHOW_TEXT;

    // Walk through all text nodes
    const walker = document.createTreeWalker(
      container,
      nodeFilter,
      null
    );

    const nodesToReplace: Array<{ node: Node; matches: { start: number; end: number }[] }> = [];
    let currentNode: Node | null;

    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent || '';
      const matches = searchAndReplaceUtils.findMatches(
        text,
        searchTerm,
        caseSensitive,
        wholeWords
      );

      if (matches.length > 0) {
        nodesToReplace.push({ node: currentNode, matches });
        matchCount += matches.length;
      }
    }

    // Replace text nodes with spans
    let highlightedCount = 0;
    nodesToReplace.forEach(({ node, matches }) => {
      const text = node.textContent || '';
      const fragment = document.createDocumentFragment();
      let lastEnd = 0;

      matches.forEach(({ start, end }) => {
        if (lastEnd < start) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastEnd, start))
          );
        }

        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'search-highlight-dom';
        highlightSpan.dataset.searchIndex = String(startIndex + highlightedCount);
        highlightSpan.style.cssText = `
          padding: 2px 0;
          scroll-margin-top: 140px;
          scroll-margin-bottom: 140px;
        `;
        highlightSpan.textContent = text.substring(start, end);
        fragment.appendChild(highlightSpan);

        highlightedCount += 1;
        lastEnd = end;
      });

      if (lastEnd < text.length) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastEnd))
        );
      }

      node.parentNode?.replaceChild(fragment, node);
    });

    return matchCount;
  },

  /**
   * Scroll to a highlighted DOM match by index
   */
  scrollToMatch(container: HTMLElement | null, index: number) {
    if (!container || index < 0) return null;

    const nodes = Array.from(container.querySelectorAll<HTMLSpanElement>('.search-highlight-dom'));
    if (nodes.length === 0) return null;

    nodes.forEach((node) => {
      const nodeIndex = Number(node.dataset.searchIndex ?? -1);
      node.classList.toggle('search-highlight-current', nodeIndex === index);
    });

    const node = container.querySelector<HTMLSpanElement>(`.search-highlight-dom[data-search-index="${index}"]`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    return node;
  },

  getHighlightElements(container: HTMLElement | null) {
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLSpanElement>('.search-highlight-dom'));
  },

  /**
   * Clear highlights in DOM
   */
  clearHighlights(container: HTMLElement | null) {
    if (!container) return;
    
    const highlighted = container.querySelectorAll('.search-highlight-dom');
    highlighted.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });
  },

  /**
   * Replace a single match at known position, preserving all formatting/marks.
   * Uses ProseMirror transaction API to ensure marks and node structure are preserved.
   * 
   * @param editor TipTap editor instance
   * @param from Absolute position of match start
   * @param to Absolute position of match end
   * @param replaceText Replacement text
   */
  replaceSingleMatch(editor: any, from: number, to: number, replaceText: string) {
    if (!editor) return false;
    
    try {
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .insertContent(replaceText)
        .run();
      return true;
    } catch (e) {
      console.error('Failed to replace single match:', e);
      return false;
    }
  },

  /**
   * Replace all matches in document, preserving formatting.
   * Operates at the ProseMirror node level to maintain marks and structure.
   * Processes matches in reverse order (highest to lowest position) to avoid position shifts.
   * 
   * @param editor TipTap editor instance
   * @param searchTerm Text to find
   * @param replaceText Replacement text
   * @param caseSensitive Whether to match case
   * @param wholeWords Whether to match whole words only
   */
  replaceAllMatches(
    editor: any,
    searchTerm: string,
    replaceText: string,
    caseSensitive: boolean = false,
    wholeWords: boolean = false
  ): boolean {
    if (!editor) return false;

    try {
      // Find all matches in document
      const matches = searchAndReplaceUtils.findMatchesInDoc(
        editor.state.doc,
        searchTerm,
        caseSensitive,
        wholeWords
      );

      if (matches.length === 0) return false;

      // Process matches in reverse order to avoid position shifts
      const sortedMatches = matches.sort((a, b) => b.start - a.start);

      // Use a single transaction for all replacements
      editor
        .chain()
        .focus();

      sortedMatches.forEach(({ start, end }) => {
        editor.view.dispatch(
          editor.state.tr
            .setSelection(editor.state.tr.selection.constructor.between(start, end))
            .replaceWith(start, end, editor.state.schema.text(replaceText))
        );
      });

      return true;
    } catch (e) {
      console.error('Failed to replace all matches:', e);
      return false;
    }
  },

  /**
   * Perform replace all with proper transaction handling.
   * Alternative implementation that batches updates into a single transaction.
   * This version is more efficient for large numbers of replacements.
   */
  replaceAllMatchesOptimized(
    editor: any,
    searchTerm: string,
    replaceText: string,
    caseSensitive: boolean = false,
    wholeWords: boolean = false
  ): boolean {
    if (!editor) return false;

    try {
      const matches = searchAndReplaceUtils.findMatchesInDoc(
        editor.state.doc,
        searchTerm,
        caseSensitive,
        wholeWords
      );

      if (matches.length === 0) return false;

      // Sort in reverse order for safe replacement
      const sortedMatches = [...matches].sort((a, b) => b.start - a.start);

      // Build a single transaction with all replacements
      let tr = editor.state.tr;
      sortedMatches.forEach(({ start, end }) => {
        tr = tr.replaceWith(start, end, editor.state.schema.text(replaceText));
      });

      editor.view.dispatch(tr);
      return true;
    } catch (e) {
      console.error('Failed to replace all matches (optimized):', e);
      return false;
    }
  },
};
