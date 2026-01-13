import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Scene } from "../types/document";

interface Props {
  scene: Scene;
  active: boolean;
  onClick: () => void;
}

export default function SortableScene({
  scene,
  active,
  onClick,
}: Props) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={active ? "scene active" : "scene"}
      onClick={onClick}
    >
      ✦ {scene.title}
    </li>
  );
}
