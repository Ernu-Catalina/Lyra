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

      localMatches.forEach((m) => {
        results.push({
          chapterId: chapter.id,
          sceneId: scene.id,
          chapterIndex,
          sceneIndex,
          from: m.start,
          to: m.end,
          text: m.text,
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

        localMatches.forEach((m) => {
          results.push({
            chapterId: chapter.id,
            sceneId: scene.id,
            chapterIndex,
            sceneIndex,
            from: m.start,
            to: m.end,
            text: m.text,
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
    wholeWords: boolean = false
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
        highlightSpan.style.cssText = `
          padding: 2px 0;
          scroll-margin-top: 140px;
          scroll-margin-bottom: 140px;
        `;
        highlightSpan.textContent = text.substring(start, end);
        fragment.appendChild(highlightSpan);

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
    if (index >= nodes.length) return null;

    nodes.forEach((node, nodeIndex) => {
      node.classList.toggle('search-highlight-current', nodeIndex === index);
    });

    const node = nodes[index];
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
};
