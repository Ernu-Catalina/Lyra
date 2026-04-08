import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indentation: {
      /**
       * Increase the indentation of the current selection
       */
      sinkIndent: () => ReturnType;
      /**
       * Decrease the indentation of the current selection
       */
      liftIndent: () => ReturnType;
    };
  }
}

export const Indentation = Extension.create({
  name: "indentation",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
      indentLevels: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      defaultIndentLevel: 0,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: this.options.defaultIndentLevel,
            parseHTML: (element) => {
              const indent = element.style.marginLeft || element.style.textIndent;
              if (indent) {
                const level = parseInt(indent.replace("em", ""), 10);
                return level || this.options.defaultIndentLevel;
              }
              return this.options.defaultIndentLevel;
            },
            renderHTML: (attributes) => {
              if (attributes.indent && attributes.indent > 0) {
                return {
                  style: `margin-left: ${attributes.indent}em;`,
                };
              }
              return {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      sinkIndent:
        () =>
        ({ commands, state }) => {
          const { from, to } = state.selection;
          let nodesUpdated = 0;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0;
              const newIndent = Math.min(currentIndent + 1, Math.max(...this.options.indentLevels));
              if (newIndent !== currentIndent) {
                commands.setNodeAttributes(pos, { indent: newIndent });
                nodesUpdated++;
              }
            }
          });

          return nodesUpdated > 0;
        },

      liftIndent:
        () =>
        ({ commands, state }) => {
          const { from, to } = state.selection;
          let nodesUpdated = 0;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0;
              const newIndent = Math.max(currentIndent - 1, Math.min(...this.options.indentLevels));
              if (newIndent !== currentIndent) {
                commands.setNodeAttributes(pos, { indent: newIndent });
                nodesUpdated++;
              }
            }
          });

          return nodesUpdated > 0;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.sinkIndent(),
      "Shift-Tab": () => this.editor.commands.liftIndent(),
    };
  },
});