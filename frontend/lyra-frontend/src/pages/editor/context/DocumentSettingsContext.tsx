import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../../../api/client";

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

// BUG FIX 1: Apply document settings to page container via CSS
export function applyPageStyles(settings: DocumentSettings) {
  const MM: Record<string, number> = { mm: 1, cm: 10, in: 25.4 };
  const factor = MM[settings.marginUnit] ?? 1;
  const toMm = (v: number) => v * factor;

  const FORMATS: Record<string, { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    Letter: { width: 215.9, height: 279.4 },
    A5: { width: 148, height: 210 },
    Legal: { width: 215.9, height: 355.6 },
  };

  const { width, height } =
    settings.paperFormat === "Custom"
      ? { width: settings.customWidth, height: settings.customHeight }
      : FORMATS[settings.paperFormat];

  const el = document.querySelector<HTMLElement>(".page-container");
  if (!el) return;

  el.style.paddingTop = `${toMm(settings.marginTop)}mm`;
  el.style.paddingBottom = `${toMm(settings.marginBottom)}mm`;
  el.style.paddingLeft = `${toMm(settings.marginLeft)}mm`;
  el.style.paddingRight = `${toMm(settings.marginRight)}mm`;
  el.style.width = `${width}mm`;
  el.style.minHeight = `${height}mm`;
  el.style.boxSizing = "border-box";
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

export function DocumentSettingsProvider({
  children,
  projectId,
  documentId,
}: {
  children: ReactNode;
  projectId?: string;
  documentId?: string;
}) {
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!projectId || !documentId) return;

    const loadSettings = async () => {
      try {
        const response = await api.get(`/projects/${projectId}/documents/${documentId}/settings`);
        const backendSettings = response.data.settings;

        if (backendSettings && Object.keys(backendSettings).length > 0) {
          const merged = { ...DEFAULT_SETTINGS, ...backendSettings };
          setSettings(merged);
          applyPageStyles(merged);
          localStorage.setItem("lyra-document-settings", JSON.stringify(merged));
          return;
        }
      } catch (error) {
        console.error("Failed to load document settings from backend:", error);
      }

      const stored = localStorage.getItem("lyra-document-settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(merged);
          applyPageStyles(merged);
        } catch (e) {
          console.error("Failed to load document settings from localStorage:", e);
        }
      }
    };

    loadSettings();
  }, [projectId, documentId]);

  const updateSettings = (newSettings: DocumentSettings) => {
    setSettings(newSettings);
    applyPageStyles(newSettings);
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
