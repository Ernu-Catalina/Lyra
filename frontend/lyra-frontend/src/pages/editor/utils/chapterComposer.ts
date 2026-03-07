// src/utils/chapterComposer.ts
import type { Scene } from "../../../types/document";

export function composeChapter(scenes: Scene[]) {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);

  return {
    type: "doc",
    content: ordered.flatMap((scene) => [
      {
        type: "scene",
        attrs: { id: scene.id, title: scene.title },
        content: [
          {
            type: "paragraph",
            content: scene.content
              ? [{ type: "text", text: scene.content }]
              : [],
          },
        ],
      },
      { type: "paragraph" }, // optional separator
    ]),
  };
}

// Optional: reverse function (for saving)
export function extractScenesFromJson(json: any): Partial<Scene>[] {
  const scenes: Partial<Scene>[] = [];

  json.content?.forEach((node: any) => {
    if (node.type === "scene") {
      const content = node.content?.[0]?.content?.[0]?.text || "";
      scenes.push({
        id: node.attrs.id,
        title: node.attrs.title,
        content,
      });
    }
  });

  return scenes;
}