import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface DocumentSettings {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginUnit: "mm" | "cm" | "in";
  paperFormat: "A4" | "Letter" | "A5" | "Legal" | "Custom";
  customWidth: number;
  customHeight: number;
  defaultAlignment: "left" | "center" | "right" | "justify";
  defaultFont: string;
  defaultFontSize: number;
  chapterTitleFormat: "none" | "chapter-number" | "chapter-number-title" | "number-title" | "title-only";
  chapterTitleSize: number;
  chapterTitleAlignment: "left" | "center" | "right";
  chapterTitleStyle: "normal" | "bold" | "italic" | "bold-italic";
  blankLinesAfterChapter: number;
  pageBreakAfterChapter: boolean;
}

const DEFAULT_SETTINGS: DocumentSettings = {
  marginTop: 2.5,
  marginBottom: 2.5,
  marginLeft: 2.5,
  marginRight: 2.5,
  marginUnit: "cm",
  paperFormat: "A4",
  customWidth: 210,
  customHeight: 297,
  defaultAlignment: "left",
  defaultFont: "Arial, sans-serif",
  defaultFontSize: 12,
  chapterTitleFormat: "chapter-number-title",
  chapterTitleSize: 16,
  chapterTitleAlignment: "center",
  chapterTitleStyle: "bold",
  blankLinesAfterChapter: 2,
  pageBreakAfterChapter: true,
};

interface DocumentSettingsContextType {
  settings: DocumentSettings;
  updateSettings: (settings: DocumentSettings) => void;
}

const DocumentSettingsContext = createContext<DocumentSettingsContextType | undefined>(undefined);

export function DocumentSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("lyra-document-settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Failed to load document settings:", e);
      }
    }
  }, []);

  const updateSettings = (newSettings: DocumentSettings) => {
    setSettings(newSettings);
    localStorage.setItem("lyra-document-settings", JSON.stringify(newSettings));
  };

  return (
    <DocumentSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </DocumentSettingsContext.Provider>
  );
}

export function useDocumentSettings() {
  const context = useContext(DocumentSettingsContext);
  if (!context) {
    throw new Error("useDocumentSettings must be used within DocumentSettingsProvider");
  }
  return context;
}
