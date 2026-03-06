// src/common_components/SidebarHeader.tsx
import { Button } from "../../../../common_components/Button";
interface SidebarHeaderProps {
  documentTitle: string;
  onAddChapter: () => void;
}

export function SidebarHeader({ documentTitle, onAddChapter }: SidebarHeaderProps) {
  return (
    <div >
      <h2>{documentTitle}</h2>
      <Button variant="primary" size="sm" onClick={onAddChapter}>
        + Chapter
      </Button>
    </div>
  );
}