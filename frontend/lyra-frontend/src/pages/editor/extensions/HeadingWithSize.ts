import Heading from "@tiptap/extension-heading";

const headingSizes = {
  1: "28px",
  2: "22px",
  3: "18px",
  4: "16px",
  5: "14px",
  6: "12px",
} as const;

export const HeadingWithSize = Heading.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setHeading:
        ({ level }) =>
        ({ commands }) => {
          const fontSize = headingSizes[level as keyof typeof headingSizes] ?? "16px";
          return commands.chain().focus().setNode(this.name, { level }).setMark("textStyle", { fontSize }).run();
        },
    };
  },
});
