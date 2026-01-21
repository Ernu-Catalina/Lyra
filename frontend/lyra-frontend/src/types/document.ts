export interface Scene {
  id: string;
  title: string;
  order: number;
  wordcount: number;
  content?: string;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  wordcount: number;
  scenes: Scene[];
}

export interface DocumentOutline {
  document_id: string;
  title: string;
  total_wordcount: number;
  chapters: Chapter[];
}

export interface Project {
  _id: string;
  name: string;
  cover_image_url?: string;
}

export interface Item {
  _id: string;
  title: string;
  type: "document" | "folder";
  created_at: string;
  updated_at: string;
  chapter_count?: number;
  word_count?: number;
  parent_id: string | null;     // ← make non-optional for clarity
}