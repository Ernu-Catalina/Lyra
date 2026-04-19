import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
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
  defaultLineHeight: number;
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

  el.style.setProperty("--page-width", `${width}mm`);
  el.style.setProperty("--page-height", `${height}mm`);
  el.style.setProperty("--page-margin-top", `${toMm(settings.marginTop)}mm`);
  el.style.setProperty("--page-margin-bottom", `${toMm(settings.marginBottom)}mm`);
  el.style.setProperty("--page-margin-left", `${toMm(settings.marginLeft)}mm`);
  el.style.setProperty("--page-margin-right", `${toMm(settings.marginRight)}mm`);
  el.style.setProperty("--page-font-size", `${settings.defaultFontSize}pt`);
  el.style.setProperty("--page-line-height", `${settings.defaultLineHeight}`);
  el.style.setProperty("--page-font-family", settings.defaultFont);
  // Calibrated default font size for Google Docs match
  const VISUAL_CORRECTION = 1;
  const correctedFontSize = settings.defaultFontSize * VISUAL_CORRECTION;

  el.style.setProperty("--editor-base-font-size", `${correctedFontSize}pt`);

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
  defaultLineHeight: 1.5,
  chapterTitleFormat: "chapter-number-title",
  chapterTitleSize: 16,
  chapterTitleAlignment: "center",
  chapterTitleStyle: "bold",
  blankLinesAfterChapter: 2,
  pageBreakAfterChapter: true,
};

interface DocumentSettingsContextType {
  settings: DocumentSettings;
  updateSettings: (settings: DocumentSettings, skipBackendSave?: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!projectId || !documentId) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch settings from backend (single source of truth)
      const response = await api.get(`/projects/${projectId}/documents/${documentId}/settings`);
      const backendSettings = response.data.settings;

      if (backendSettings && Object.keys(backendSettings).length > 0) {
        const merged = { ...DEFAULT_SETTINGS, ...backendSettings };
        setSettings(merged);
        applyPageStyles(merged);
        return;
      }

      // No settings on backend, use defaults
      setSettings(DEFAULT_SETTINGS);
      applyPageStyles(DEFAULT_SETTINGS);
    } catch (err: any) {
      console.error("Failed to load document settings from backend:", err);
      setError("Failed to load document settings");
      // Fallback to defaults on error
      setSettings(DEFAULT_SETTINGS);
      applyPageStyles(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, documentId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // FIX: updateSettings now persists to backend immediately (not just localStorage)
  const updateSettings = useCallback(async (newSettings: DocumentSettings, skipBackendSave = false) => {
    // DEBUG - remove after verification
    console.log("=== updateSettings CALLED with ===", newSettings);
    console.log("=== Context has projectId:", projectId, "documentId:", documentId);

    // Always apply locally first for immediate UI feedback
    setSettings(newSettings);
    applyPageStyles(newSettings);

    // If skipBackendSave is true, only update local state (used during form input)
    if (skipBackendSave) {
      console.log("=== skipBackendSave is true, not persisting to backend");
      return;
    }

    // Persist to backend if we have a projectId and documentId
    if (!projectId || !documentId) {
      console.error("❌ Cannot save document settings: missing projectId or documentId", { projectId, documentId });
      setError("Cannot save: missing document context");
      throw new Error("Missing projectId or documentId");
    }

    try {
      setError(null);
      const url = `/projects/${projectId}/documents/${documentId}/settings`;
      console.log("=== SENDING PATCH to", url, "with body", newSettings);
      
      const response = await api.patch(url, newSettings);
      
      console.log("=== PATCH SUCCESS ===", response.data);
      // Settings saved successfully
    } catch (err: any) {
      console.error("❌ Failed to save document settings to backend:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to save document settings";
      setError(errorMsg);
      throw err; // Re-throw so caller can handle error
    }
  }, [documentId, projectId]);

  const contextValue = useMemo(() => ({
    settings,
    updateSettings,
    isLoading,
    error,
  }), [settings, updateSettings, isLoading, error]);

  return (
    <DocumentSettingsContext.Provider value={contextValue}>
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
