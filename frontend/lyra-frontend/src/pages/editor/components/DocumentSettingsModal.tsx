import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { useParams } from "react-router-dom";
import { X, Eye } from "lucide-react";
import api from "../../../api/client";
import { useDocumentSettings, type DocumentSettings, applyPageStyles } from "../context/DocumentSettingsContext";

interface DocumentSettingsModalProps {
  editor: Editor | null;
  onClose: () => void;
  onSettingsApplied?: () => void;
}

const PAPER_FORMATS = {
  A4: { width: 210, height: 297, label: "A4 (210 × 297 mm)" },
  Letter: { width: 215.9, height: 279.4, label: "Letter (8.5 × 11 in)" },
  A5: { width: 148, height: 210, label: "A5 (148 × 210 mm)" },
  Legal: { width: 215.9, height: 355.6, label: "Legal (8.5 × 14 in)" },
  Custom: { width: 0, height: 0, label: "Custom" },
};

const CHAPTER_TITLE_FORMATS = {
  none: { label: "No chapter titles", preview: "" },
  "chapter-number": { label: "Chapter 1, Chapter 2, etc.", preview: "Chapter 1" },
  "chapter-number-title": { label: "Chapter 1: Title", preview: "Chapter 1: My Chapter Title" },
  "number-title": { label: "1. Title", preview: "1. My Chapter Title" },
  "title-only": { label: "Title only", preview: "My Chapter Title" },
};

const FONT_FAMILIES = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans MS" },
  { value: "Impact, sans-serif", label: "Impact" },
];

export function DocumentSettingsModal({ editor, onClose, onSettingsApplied }: DocumentSettingsModalProps) {
  const { settings, updateSettings } = useDocumentSettings();
  const modalRef = useRef<HTMLDivElement>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [tempSettings, setTempSettings] = useState<DocumentSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();

  // Sync with context settings
  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  // Close on outside click unless the warning confirmation is open
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showWarning) {
        return;
      }
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, showWarning]);

  const convertToMm = (value: number, unit: "mm" | "cm" | "in"): number => {
    switch (unit) {
      case "cm": return value * 10;
      case "in": return value * 25.4;
      default: return value;
    }
  };

  const convertFromMm = (value: number, unit: "mm" | "cm" | "in"): number => {
    switch (unit) {
      case "cm": return Math.round(value / 10 * 100) / 100;
      case "in": return Math.round(value / 25.4 * 100) / 100;
      default: return value;
    }
  };

  const handleSave = () => {
    setShowWarning(true);
  };

  const handleConfirmSave = async () => {
    const settingsToSave = {
      ...tempSettings,
      customWidth: tempSettings.paperFormat === "Custom" ? tempSettings.customWidth : 0,
      customHeight: tempSettings.paperFormat === "Custom" ? tempSettings.customHeight : 0,
    };
    await updateSettings(settingsToSave);
    // DEBUG - remove after verification
    console.log("=== SAVE BUTTON CLICKED ===");
    console.log("=== tempSettings ===", tempSettings);
    console.log("=== context updateSettings function exists:", typeof updateSettings === "function");
    
    if (!projectId || !documentId) {
      setError("Unable to save settings without a valid project or document.");
      setShowWarning(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // FIX: updateSettings now handles backend persistence and will throw on failure
      console.log("=== Calling updateSettings...");
      await updateSettings(tempSettings);
      console.log("=== updateSettings completed successfully");
      
      // Optionally apply settings to existing content
      try {
        await api.post(`/projects/${projectId}/documents/${documentId}/apply-settings`);
      } catch (applyErr) {
        console.warn("Could not apply settings to document content:", applyErr);
        // Don't fail the entire operation if apply fails
      }

      applyPageStyles(tempSettings);
      setShowWarning(false);
      onSettingsApplied?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to save document settings", err);
      setError(err?.response?.data?.detail || err.message || "Failed to save document settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempSettings(settings);
    onClose();
  };

  const getChapterTitlePreview = (format: string, chapterNumber: number = 1, title: string = "My Chapter Title") => {
    switch (format) {
      case "chapter-number": return `Chapter ${chapterNumber}`;
      case "chapter-number-title": return `Chapter ${chapterNumber}: ${title}`;
      case "number-title": return `${chapterNumber}. ${title}`;
      case "title-only": return title;
      default: return "";
    }
  };

  return (
    <>
      {/* Overlay - Semi-transparent dark overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between bg-[var(--bg-secondary)] border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Document Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-primary)] rounded transition-colors text-[var(--text-primary)]"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-8">
          {/* Paper Format */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Paper Format</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {(Object.entries(PAPER_FORMATS) as Array<[keyof typeof PAPER_FORMATS, typeof PAPER_FORMATS.A4]>).map(([key, format]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[var(--bg-secondary)]">
                    <input
                      type="radio"
                      checked={tempSettings.paperFormat === key}
                      onChange={() => {
                        const newFormat = key;
                        let width = tempSettings.customWidth;
                        let height = tempSettings.customHeight;
                        if (newFormat !== "Custom") {
                          width = 0;
                          height = 0;
                        }
                        setTempSettings({
                          ...tempSettings,
                          paperFormat: newFormat,
                          customWidth: width,
                          customHeight: height
                        });
                      }}
                      className="w-4 h-4 text-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">{format.label}</span>
                  </label>
                ))}
              </div>
              {tempSettings.paperFormat === "Custom" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={tempSettings.customWidth}
                      onChange={(e) =>
                        setTempSettings({ ...tempSettings, customWidth: Math.max(50, Number(e.target.value)) })
                      }
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                      min="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={tempSettings.customHeight}
                      onChange={(e) =>
                        setTempSettings({ ...tempSettings, customHeight: Math.max(50, Number(e.target.value)) })
                      }
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                      min="50"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Margins */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Margins</h3>
              <select
                value={tempSettings.marginUnit}
                onChange={(e) => {
                  const newUnit = e.target.value as "mm" | "cm" | "in";
                  // Convert existing margins to new unit
                  const convertValue = (value: number) => convertFromMm(convertToMm(value, tempSettings.marginUnit), newUnit);
                  setTempSettings({
                    ...tempSettings,
                    marginUnit: newUnit,
                    marginTop: convertValue(tempSettings.marginTop),
                    marginBottom: convertValue(tempSettings.marginBottom),
                    marginLeft: convertValue(tempSettings.marginLeft),
                    marginRight: convertValue(tempSettings.marginRight),
                  });
                }}
                className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">inches</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Top ({tempSettings.marginUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempSettings.marginTop}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, marginTop: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Bottom ({tempSettings.marginUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempSettings.marginBottom}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, marginBottom: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Left ({tempSettings.marginUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempSettings.marginLeft}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, marginLeft: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Right ({tempSettings.marginUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempSettings.marginRight}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, marginRight: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Default Font and Size */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Default Text Formatting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Font Family
                </label>
                <select
                  value={tempSettings.defaultFont}
                  onChange={(e) => setTempSettings({ ...tempSettings, defaultFont: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Font Size (pt)
                </label>
                <input
                  type="number"
                  value={tempSettings.defaultFontSize}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, defaultFontSize: Math.max(8, Math.min(72, Number(e.target.value))) })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  min="8"
                  max="72"
                />
              </div>
            </div>

            {/* Default Alignment */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Default Alignment
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["left", "center", "right", "justify"] as const).map((align) => (
                  <label key={align} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--bg-secondary)]">
                    <input
                      type="radio"
                      checked={tempSettings.defaultAlignment === align}
                      onChange={() => setTempSettings({ ...tempSettings, defaultAlignment: align })}
                      className="w-4 h-4 text-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-primary)] capitalize">{align}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Chapter Title Formatting */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Chapter Title Formatting</h3>

            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Title Format
              </label>
              <div className="space-y-2">
                {(Object.entries(CHAPTER_TITLE_FORMATS) as Array<[keyof typeof CHAPTER_TITLE_FORMATS, typeof CHAPTER_TITLE_FORMATS.none]>).map(([key, format]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[var(--bg-secondary)]">
                    <input
                      type="radio"
                      checked={tempSettings.chapterTitleFormat === key}
                      onChange={() => setTempSettings({ ...tempSettings, chapterTitleFormat: key })}
                      className="w-4 h-4 text-[var(--accent)]"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-[var(--text-primary)]">{format.label}</span>
                      {format.preview && (
                        <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono bg-[var(--bg-secondary)] p-1 rounded">
                          {format.preview}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Title Styling Options */}
            {tempSettings.chapterTitleFormat !== "none" && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Size (pt)
                  </label>
                  <input
                    type="number"
                    value={tempSettings.chapterTitleSize}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, chapterTitleSize: Math.max(8, Math.min(72, Number(e.target.value))) })
                    }
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                    min="8"
                    max="72"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Alignment
                  </label>
                  <select
                    value={tempSettings.chapterTitleAlignment}
                    onChange={(e) => setTempSettings({ ...tempSettings, chapterTitleAlignment: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Style
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "normal", label: "Normal" },
                      { value: "bold", label: "Bold" },
                      { value: "italic", label: "Italic" },
                      { value: "bold-italic", label: "Bold Italic" },
                    ].map((style) => (
                      <label key={style.value} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--bg-primary)]">
                        <input
                          type="radio"
                          checked={tempSettings.chapterTitleStyle === style.value}
                          onChange={() => setTempSettings({ ...tempSettings, chapterTitleStyle: style.value as any })}
                          className="w-4 h-4 text-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">{style.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live Preview */}
            {tempSettings.chapterTitleFormat !== "none" && (
              <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} className="text-[var(--text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Live Preview</span>
                </div>
                <div
                  className="p-4 bg-white border border-[var(--border)] rounded text-[var(--text-primary)]"
                  style={{
                    fontFamily: tempSettings.defaultFont,
                    fontSize: `${tempSettings.chapterTitleSize}px`,
                    fontWeight: tempSettings.chapterTitleStyle.includes("bold") ? "bold" : "normal",
                    fontStyle: tempSettings.chapterTitleStyle.includes("italic") ? "italic" : "normal",
                    textAlign: tempSettings.chapterTitleAlignment,
                  }}
                >
                  {getChapterTitlePreview(tempSettings.chapterTitleFormat)}
                </div>
              </div>
            )}
          </div>

          {/* Spacing Options */}
          <div>
             <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
               Spacing Options
             </h3>
                    
             <div className="grid grid-cols-2 gap-4">
                    
               {/* Blank Lines After Chapter */}
               <div>
                 <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                   Blank Lines After Chapter
                 </label>
                 <input
                   type="number"
                   value={tempSettings.blankLinesAfterChapter}
                   onChange={(e) =>
                     setTempSettings({
                       ...tempSettings,
                       blankLinesAfterChapter: Math.max(0, Number(e.target.value)),
                     })
                   }
                   className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                   min="0"
                 />
               </div>
                 
               {/* Page Break After Chapter */}
               <div className="flex items-center gap-3 pt-7">
                 <input
                   type="checkbox"
                   id="pageBreakAfterChapter"
                   checked={tempSettings.pageBreakAfterChapter}
                   onChange={(e) =>
                     setTempSettings({
                       ...tempSettings,
                       pageBreakAfterChapter: e.target.checked,
                     })
                   }
                   className="w-4 h-4 text-[var(--accent)] rounded"
                 />
                 <label
                   htmlFor="pageBreakAfterChapter"
                   className="text-sm text-[var(--text-primary)]"
                 >
                   Page break after each chapter
                 </label>
               </div>
                 
               {/* Default First-Line Indent — spans full width */}
               <div className="col-span-2 pt-2 border-t border-[var(--border)]">
                 <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                   Default First-Line Indent
                 </label>
                 <div className="flex items-center gap-2">
                   <input
                     type="number"
                     step="0.1"
                     min="0"
                     max="10"
                     value={tempSettings.defaultFirstLineIndent}
                     onChange={(e) =>
                       setTempSettings({
                         ...tempSettings,
                         defaultFirstLineIndent: Math.max(0, Number(e.target.value)),
                       })
                     }
                     className="w-24 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                   />
                   <select
                     value={tempSettings.defaultFirstLineIndentUnit}
                     onChange={(e) =>
                       setTempSettings({
                         ...tempSettings,
                         defaultFirstLineIndentUnit: e.target.value as "cm" | "in" | "mm",
                       })
                     }
                     className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                   >
                     <option value="cm">cm</option>
                     <option value="in">in</option>
                     <option value="mm">mm</option>
                   </select>
                   <span className="text-xs text-[var(--text-secondary)]">
                     Applies to paragraphs with no manual indent
                   </span>
                 </div>
               </div>
                   
             </div>
           </div>

          {/* Info Box */}
          <div className="bg-[var(--accent)]/10 border border-[var(--accent)] rounded p-4">
            <p className="text-sm text-[var(--text-primary)]">
              <strong>Note:</strong> Applying these settings will update the entire document's formatting to match the default values you set here. Chapter title formatting will be applied when viewing the document in chapter or document view.
            </p>
          </div>
          {error && (
            <div className="rounded border border-red-400 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors font-medium"
          >
            Apply Settings
          </button>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Apply Document Settings?</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              This will override the formatting of the entire document. This action cannot be easily undone. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Apply to Entire Document"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
