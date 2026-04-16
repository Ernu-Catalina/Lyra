import Heading from "@tiptap/extension-heading";

const headingSizes: Record<number, string> = {
  1: "28px",
  2: "22px",
  3: "18px",
  4: "16px",
  5: "14px",
  6: "12px",
};

export const HeadingWithSize = Heading.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      levels: [1, 2, 3, 4],
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setHeading:
        ({ level }: { level: number }) =>
        ({ chain }: { chain: any }) => {
          const fontSize = headingSizes[level] ?? "16px";
          return chain()
            .setNode(this.name, { level })
            .setMark("textStyle", { fontSize })
            .run();
        },
    };
  },
});
