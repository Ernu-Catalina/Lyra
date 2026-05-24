// DocumentSettingsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import api from "../../../api/client";
import type { Editor } from "@tiptap/react";

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
  defaultParagraphSpacing: number;
  chapterTitleFormat: "none" | "chapter-number" | "chapter-number-title" | "number-title" | "title-only";
  chapterTitleSize: number;
  chapterTitleAlignment: "left" | "center" | "right";
  chapterTitleStyle: "normal" | "bold" | "italic" | "bold-italic";
  blankLinesAfterChapter: number;
  pageBreakAfterChapter: boolean;
  includePrologue: boolean;
  includeEpilogue: boolean;
  includeAcknowledgements: boolean;
  defaultFirstLineIndent: number;
  defaultFirstLineIndentUnit: "cm" | "in" | "mm";
  templateId?: string;
  templateName?: string;
}

// Apply styles to the page container and all rendered page wrappers
// Force document settings to override all inline and per-paragraph formatting
export function applyPageStyles(settings: DocumentSettings) {
  const pageElements = Array.from(document.querySelectorAll<HTMLElement>(".page-container, .page-content"));
  if (pageElements.length === 0) return;

  const VISUAL_CORRECTION = 1;
  const correctedFontSize = settings.defaultFontSize * VISUAL_CORRECTION;

  pageElements.forEach((el) => {
    // Set CSS variables for descendant usage
    el.style.setProperty("--page-font-family", settings.defaultFont);
    el.style.setProperty("--page-font-size", `${correctedFontSize}pt`);
    el.style.setProperty("--editor-base-font-size", `${correctedFontSize}pt`);
    el.style.setProperty("--page-line-height", `${settings.defaultLineHeight}`);
    el.style.setProperty("--page-paragraph-spacing", `${settings.defaultParagraphSpacing}pt`);
    
    // Force direct styles with !important to override inline marks
    el.style.setProperty("font-family", settings.defaultFont, "important");
    el.style.setProperty("font-size", `${correctedFontSize}pt`, "important");
    el.style.setProperty("line-height", `${settings.defaultLineHeight}`, "important");
    
    // Force line-height and margins on all paragraphs inside
    const paragraphs = el.querySelectorAll<HTMLElement>("p");
    paragraphs.forEach((p) => {
      p.style.setProperty("line-height", `${settings.defaultLineHeight}`, "important");
      p.style.setProperty("margin-bottom", `${settings.defaultParagraphSpacing}pt`, "important");
      // Also force font-size on paragraphs to override inline styles
      p.style.setProperty("font-size", `${correctedFontSize}pt`, "important");
    });
  });
}

// Reset all manual toolbar formatting so Document Settings win
// This removes ALL inline font-size and fontFamily marks from the entire document
export function resetAllTextFormatting(editor: Editor | null) {
  if (!editor) return;

  // Select all content first
  editor.chain()
    .focus()
    .selectAll()
    // Unset fontSize and fontFamily marks to allow document settings to take effect
    .unsetMark("textStyle")
    .run();
}

export const DEFAULT_SETTINGS: DocumentSettings = {
  marginTop: 2.5,
  marginBottom: 2.5,
  marginLeft: 2.5,
  marginRight: 2.5,
  marginUnit: "cm",
  paperFormat: "A4",
  customWidth: 0,
  customHeight: 0,
  defaultAlignment: "left",
  defaultFont: "Arial, sans-serif",
  defaultFontSize: 12,
  defaultLineHeight: 1.5,
  defaultParagraphSpacing: 8,
  chapterTitleFormat: "chapter-number-title",
  chapterTitleSize: 16,
  chapterTitleAlignment: "center",
  chapterTitleStyle: "bold",
  blankLinesAfterChapter: 2,
  pageBreakAfterChapter: true,
  includePrologue: false,
  includeEpilogue: false,
  includeAcknowledgements: false,
  defaultFirstLineIndent: 0,
  defaultFirstLineIndentUnit: "cm",
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
      applyPageStyles(DEFAULT_SETTINGS);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/projects/${projectId}/documents/${documentId}/settings`);
      const backendSettings = response.data.settings || {};

      const merged = { ...DEFAULT_SETTINGS, ...backendSettings };
      setSettings(merged);
      applyPageStyles(merged);
    } catch (err: any) {
      console.error("Failed to load document settings:", err);
      setError("Failed to load document settings");
      setSettings(DEFAULT_SETTINGS);
      applyPageStyles(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, documentId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (newSettings: DocumentSettings, skipBackendSave = false) => {
    console.log("=== updateSettings CALLED with ===", newSettings);

    // Apply locally
    setSettings(newSettings);
    applyPageStyles(newSettings);

    // Reset all manual toolbar formatting so defaults fully override
    // Note: editor is not in context yet, so we skip reset here for now
    // We'll call it from the modal instead

    if (skipBackendSave) return;

    if (!projectId || !documentId) {
      console.error("❌ Cannot save: missing projectId or documentId");
      throw new Error("Missing projectId or documentId");
    }

    try {
      const url = `/projects/${projectId}/documents/${documentId}/settings`;
      await api.patch(url, newSettings);
      console.log("=== PATCH SUCCESS ===");
    } catch (err: any) {
      console.error("❌ Failed to save document settings:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to save document settings";
      setError(errorMsg);
      throw err;
    }
  }, [projectId, documentId]);

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