import { Extension } from "@tiptap/core";

  declare module "@tiptap/core" {
    interface Commands<ReturnType> {
      indentation: {
        sinkIndent: () => ReturnType;
        liftIndent: () => ReturnType;
      };
    }
  }

  export const Indentation = Extension.create({
    name: "indentation",

    addOptions() {
      return {
        types: ["paragraph"],
        indentLevels: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        defaultIndentLevel: 0,
        indentSize: 1.5,         
      };
    },

    addGlobalAttributes() {
      return [
        {
          types: this.options.types,
          attributes: {

            indent: {
              default: 0,
              parseHTML: (element) => {
                const raw = element.style.textIndent;
                if (!raw) return 0;
                // Strip so renderHTML is the single source of truth
                element.style.removeProperty("text-indent");
                const em = parseFloat(raw);
                if (isNaN(em) || em === 0) return 0;
                // Reverse the em multiplier to recover the integer level.
                // Round to nearest integer to avoid floating point drift.
                return Math.round(em / this.options.indentSize);
              },
              renderHTML: (attributes) => {
                const level = attributes.indent ?? 0;
                            
                if (level > 0) {
                  // User indent: base default + em levels stacked on top
                  return {
                    style: `text-indent: calc(var(--default-first-line-indent, 0) + ${level * this.options.indentSize}em);`,
                  };
                }
              
                // No user indent: just the document default
                return {
                  style: `text-indent: var(--default-first-line-indent, 0);`,
                };
              },
            },

            lineHeight: {
              default: "1.15",
              parseHTML: (element) => {
                const lh = element.style.lineHeight;
                return lh || "1.15";
              },
              renderHTML: (attributes) => {
                if (!attributes.lineHeight || attributes.lineHeight === "1.15") {
                  return {};
                }
                return { style: `line-height: ${attributes.lineHeight};` };
              },
            },

          },
        },
      ];
    },

    addCommands() {
      const setIndent = (direction: 1 | -1) =>
        ({ state, dispatch }: { state: any; dispatch: any }) => {
          const { from, to } = state.selection;
          const tr = state.tr;
          let updated = false;

          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              const current = node.attrs.indent ?? 0;
              const levels = this.options.indentLevels;
              const next = Math.min(
                Math.max(current + direction, Math.min(...levels)),
                Math.max(...levels)
              );
              if (next !== current) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: next,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) dispatch(tr);
          return updated;
        };

      return {
        sinkIndent: () => setIndent(1),
        liftIndent: () => setIndent(-1),
      };
    },

    addKeyboardShortcuts() {
      return {
        Tab: () => this.editor.commands.sinkIndent(),
        "Shift-Tab": () => this.editor.commands.liftIndent(),
      };
    },
  });