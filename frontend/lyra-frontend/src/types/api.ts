export interface Project {
  _id: string;
  name: string;
}

export interface SceneOutline {
  id: string;
  title: string;
  wordcount: number;
  order: number;
}

export interface ChapterOutline {
  id: string;
  title: string;
  wordcount: number;
  order: number;
  scenes: SceneOutline[];
}

export interface DocumentOutline {
  document_id: string;
  title: string;
  total_wordcount: number;
  chapters: ChapterOutline[];
}

export interface SceneResponse {
  scene_id: string;
  chapter_id: string;
  content: string;
  scene_wordcount: number;
  chapter_wordcount: number;
  document_wordcount: number;
}
