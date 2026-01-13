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
