import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { X, Eye } from "lucide-react";
import { useDocumentSettings, type DocumentSettings, applyPageStyles, resetAllTextFormatting, DEFAULT_SETTINGS } from "../context/DocumentSettingsContext";

interface DocumentSettingsModalProps {
  editor: Editor | null;
  onClose: () => void;
  onSettingsApplied?: () => void;
}

type TabId = "general" | "page-layout" | "typography" | "chapter-formatting" | "advanced";

type PendingAction =
  | { type: "tab"; tab: TabId; settings: DocumentSettings }
  | { type: "all"; settings: DocumentSettings };

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

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type NumberField = keyof DocumentSettings;

function createNumericInputHandler(
  field: NumberField,
  min: number,
  max: number,
  isFloat: boolean = false,
  setCallback: (fn: (prev: DocumentSettings) => DocumentSettings) => void
) {
  return {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      if (inputValue === "" || inputValue === "-" || inputValue === ".") {
        setCallback((prev) => ({ ...prev, [field]: inputValue as any }));
        return;
      }
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        setCallback((prev) => ({ ...prev, [field]: numValue }));
      }
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      const numValue = parseFloat(e.target.value);
      const finalValue = isNaN(numValue) ? min : clampValue(numValue, min, max);
      setCallback((prev) => ({ ...prev, [field]: finalValue }));
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const numValue = parseFloat(e.currentTarget.value);
        const finalValue = isNaN(numValue) ? min : clampValue(numValue, min, max);
        setCallback((prev) => ({ ...prev, [field]: finalValue }));
      }
    },
  };
}

const TAB_FIELDS: Record<TabId, Array<keyof DocumentSettings>> = {
  general: ["defaultAlignment", "defaultFirstLineIndent", "defaultFirstLineIndentUnit"],
  "page-layout": [
    "paperFormat",
    "customWidth",
    "customHeight",
    "marginUnit",
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
  ],
  typography: ["defaultFont", "defaultFontSize", "defaultLineHeight", "defaultParagraphSpacing"],
  "chapter-formatting": [
    "chapterTitleFormat",
    "chapterTitleSize",
    "chapterTitleAlignment",
    "chapterTitleStyle",
    "blankLinesAfterChapter",
    "pageBreakAfterChapter",
    "showSceneTitles",
    "sceneTitleSize",
    "sceneTitleAlignment",
    "sceneTitleStyle",
    "blankLinesAfterSceneTitle",
    "pageBreakAfterSceneTitle",
    "includePrologue",
    "includeEpilogue",
    "includeAcknowledgements",
    "blankLinesAfterSpecialChapter",
  ],
  advanced: [],
};

const TAB_LABELS: Record<TabId, string> = {
  general: "General",
  "page-layout": "Page Layout",
  typography: "Typography",
  "chapter-formatting": "Chapter Formatting",
  advanced: "Advanced",
};

export function DocumentSettingsModal({ editor, onClose, onSettingsApplied }: DocumentSettingsModalProps) {
  const { settings, updateSettings } = useDocumentSettings();
  const modalRef = useRef<HTMLDivElement>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [tempSettings, setTempSettings] = useState<DocumentSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showWarning) return;
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, showWarning]);

  const convertToMm = (value: number, unit: "mm" | "cm" | "in"): number => {
    switch (unit) {
      case "cm":
        return value * 10;
      case "in":
        return value * 25.4;
      default:
        return value;
    }
  };

  const convertFromMm = (value: number, unit: "mm" | "cm" | "in"): number => {
    switch (unit) {
      case "cm":
        return Math.round((value / 10) * 100) / 100;
      case "in":
        return Math.round((value / 25.4) * 100) / 100;
      default:
        return value;
    }
  };

  const getChapterTitlePreview = (format: string, chapterNumber: number = 1, title: string = "My Chapter Title") => {
    switch (format) {
      case "chapter-number":
        return `Chapter ${chapterNumber}`;
      case "chapter-number-title":
        return `Chapter ${chapterNumber}: ${title}`;
      case "number-title":
        return `${chapterNumber}. ${title}`;
      case "title-only":
        return title;
      default:
        return "";
    }
  };

  const getTabSettings = (tab: TabId): DocumentSettings => {
    const partial = TAB_FIELDS[tab].reduce<Record<string, unknown>>((acc, field) => {
      acc[field] = tempSettings[field];
      return acc;
    }, {});
    return { ...settings, ...(partial as Partial<DocumentSettings>) };
  };

  const isTabDirty = (tab: TabId): boolean => {
    return TAB_FIELDS[tab].some((field) => tempSettings[field] !== settings[field]);
  };

  const handleApplyTab = (tab: TabId) => {
    if (!isTabDirty(tab)) return;
    setPendingAction({ type: "tab", tab, settings: getTabSettings(tab) });
    setShowWarning(true);
  };

  const handleApplyAll = () => {
    if (JSON.stringify(tempSettings) === JSON.stringify(settings)) return;
    setPendingAction({ type: "all", settings: tempSettings });
    setShowWarning(true);
  };

  const handleRestoreDefaults = () => {
    setTempSettings(DEFAULT_SETTINGS);
    setActiveTab("general");
    setError(null);
  };

  const handleConfirmSave = async () => {
    if (!pendingAction) return;

    setSaving(true);
    setError(null);

    try {
      await updateSettings(pendingAction.settings);
      if (editor) {
        resetAllTextFormatting(editor);
      }
      applyPageStyles(pendingAction.settings);
      setShowWarning(false);
      setPendingAction(null);
      onSettingsApplied?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to save document settings", err);
      setError(err?.response?.data?.detail || err.message || "Failed to save document settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempSettings(settings);
    onClose();
  };

  const renderGeneralTab = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)] max-w-3xl">General settings define the default paragraph alignment and first-line indent for new content.</p>
        <button
          type="button"
          onClick={() => handleApplyTab("general")}
          disabled={!isTabDirty("general")}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)]/90 transition-colors"
        >
          Apply General
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Alignment</label>
          <div className="grid grid-cols-4 gap-2">
            {(["left", "center", "right", "justify"] as const).map((align) => (
              <label key={align} className="flex items-center gap-2 cursor-pointer rounded border border-transparent px-3 py-2 hover:border-[var(--border)]">
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
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">First Line Indent</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={tempSettings.defaultFirstLineIndent}
              {...createNumericInputHandler("defaultFirstLineIndent", 0, 10, true, setTempSettings)}
              className="w-24 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
            />
            <label htmlFor="firstLineIndentUnit" className="sr-only">
              Unit
            </label>
            <select
              id="firstLineIndentUnit"
              value={tempSettings.defaultFirstLineIndentUnit}
              onChange={(e) => setTempSettings({ ...tempSettings, defaultFirstLineIndentUnit: e.target.value as "cm" | "in" | "mm" })}
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
              <option value="mm">mm</option>
            </select>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">Applies to paragraphs with no manual indent.</p>
        </div>
      </div>
    </div>
  );

  const renderPageLayoutTab = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)] max-w-3xl">Page setup affects paper size and printable margins for the document view.</p>
        <button
          type="button"
          onClick={() => handleApplyTab("page-layout")}
          disabled={!isTabDirty("page-layout")}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)]/90 transition-colors"
        >
          Apply Page Layout
        </button>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Paper Format</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {(Object.entries(PAPER_FORMATS) as Array<[keyof typeof PAPER_FORMATS, typeof PAPER_FORMATS.A4]>).map(([key, format]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer rounded border border-transparent p-2 hover:border-[var(--border)]">
                <input
                  type="radio"
                  checked={tempSettings.paperFormat === key}
                  onChange={() => {
                    const nextFormat = key;
                    setTempSettings((prev) => ({
                      ...prev,
                      paperFormat: nextFormat,
                      customWidth: nextFormat !== "Custom" ? 0 : prev.customWidth,
                      customHeight: nextFormat !== "Custom" ? 0 : prev.customHeight,
                    }));
                  }}
                  className="w-4 h-4 text-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{format.label}</span>
              </label>
            ))}
          </div>
          {tempSettings.paperFormat === "Custom" && (
            <div className="space-y-4 rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Width (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempSettings.customWidth}
                  {...createNumericInputHandler("customWidth", 50, 1000, true, setTempSettings)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Height (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempSettings.customHeight}
                  {...createNumericInputHandler("customHeight", 50, 1000, true, setTempSettings)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Margins</h3>
          <select
            aria-label="Margin units"
            value={tempSettings.marginUnit}
            onChange={(e) => {
              const newUnit = e.target.value as "mm" | "cm" | "in";
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
            className="px-3 py-1 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">inches</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: `Top (${tempSettings.marginUnit})`, field: "marginTop" },
            { label: `Bottom (${tempSettings.marginUnit})`, field: "marginBottom" },
            { label: `Left (${tempSettings.marginUnit})`, field: "marginLeft" },
            { label: `Right (${tempSettings.marginUnit})`, field: "marginRight" },
          ].map((item) => (
            <div key={item.label}>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{item.label}</label>
              <input
                type="number"
                step="0.1"
                value={tempSettings[item.field as keyof DocumentSettings] as number}
                {...createNumericInputHandler(item.field as NumberField, 0, 100, true, setTempSettings)}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTypographyTab = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)] max-w-3xl">Typography controls the look of the text block used throughout the document.</p>
        <button
          type="button"
          onClick={() => handleApplyTab("typography")}
          disabled={!isTabDirty("typography")}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)]/90 transition-colors"
        >
          Apply Typography
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="defaultFont" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Font</label>
          <select
            id="defaultFont"
            value={tempSettings.defaultFont}
            onChange={(e) => setTempSettings({ ...tempSettings, defaultFont: e.target.value })}
            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Font Size (pt)</label>
          <input
            type="number"
            value={tempSettings.defaultFontSize}
            {...createNumericInputHandler("defaultFontSize", 8, 72, false, setTempSettings)}
            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
            min="8"
            max="72"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="defaultLineHeight" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Line Spacing</label>
          <select
            id="defaultLineHeight"
            value={tempSettings.defaultLineHeight}
            onChange={(e) => setTempSettings({ ...tempSettings, defaultLineHeight: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
          >
            <option value={1}>1</option>
            <option value={1.15}>1.15</option>
            <option value={1.5}>1.5</option>
            <option value={2}>2</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Paragraph Spacing (pt)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={tempSettings.defaultParagraphSpacing}
              {...createNumericInputHandler("defaultParagraphSpacing", 0, 32, false, setTempSettings)}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
              min="0"
              max="32"
              step="1"
            />
            <span className="text-sm text-[var(--text-secondary)]">pt</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChapterFormattingTab = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)] max-w-3xl">Chapter formatting settings are applied for chapter headings and section breaks.</p>
        <button
          type="button"
          onClick={() => handleApplyTab("chapter-formatting")}
          disabled={!isTabDirty("chapter-formatting")}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)]/90 transition-colors"
        >
          Apply Formatting
        </button>
      </div>

      {/* ── Chapter Title Format ───────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Chapter Title Format</label>
        <div className="space-y-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          {(Object.entries(CHAPTER_TITLE_FORMATS) as Array<[keyof typeof CHAPTER_TITLE_FORMATS, typeof CHAPTER_TITLE_FORMATS.none]>).map(([key, format]) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer rounded p-2 hover:bg-[var(--bg-primary)]">
              <input
                type="radio"
                checked={tempSettings.chapterTitleFormat === key}
                onChange={() => setTempSettings({ ...tempSettings, chapterTitleFormat: key })}
                className="w-4 h-4 mt-1 text-[var(--accent)]"
              />
              <div>
                <div className="text-sm text-[var(--text-primary)]">{format.label}</div>
                {format.preview && <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{format.preview}</div>}
              </div>
            </label>
          ))}
        </div>
      </div>

      {tempSettings.chapterTitleFormat !== "none" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Size (pt)</label>
              <input
                type="number"
                value={tempSettings.chapterTitleSize}
                {...createNumericInputHandler("chapterTitleSize", 8, 72, false, setTempSettings)}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                min="8"
                max="72"
              />
            </div>
            <div>
              <label htmlFor="chapterTitleAlignment" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Alignment</label>
              <select
                id="chapterTitleAlignment"
                value={tempSettings.chapterTitleAlignment}
                onChange={(e) => setTempSettings({ ...tempSettings, chapterTitleAlignment: e.target.value as any })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Style</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["normal", "bold", "italic", "bold-italic"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer rounded border border-transparent p-2 hover:border-[var(--border)]">
                    <input
                      type="radio"
                      checked={tempSettings.chapterTitleStyle === s}
                      onChange={() => setTempSettings({ ...tempSettings, chapterTitleStyle: s as any })}
                      className="w-4 h-4 text-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-primary)] capitalize">{s.replace("-", " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={16} className="text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Live Preview</span>
            </div>
            <div
              className="rounded p-2"
              style={{
                fontFamily: tempSettings.defaultFont,
                fontSize: `${tempSettings.chapterTitleSize}px`,
                fontWeight: tempSettings.chapterTitleStyle.includes("bold") ? "bold" : "normal",
                fontStyle: tempSettings.chapterTitleStyle.includes("italic") ? "italic" : "normal",
                textAlign: tempSettings.chapterTitleAlignment as React.CSSProperties["textAlign"],
                color: "var(--text-primary)",
              }}
            >
              {getChapterTitlePreview(tempSettings.chapterTitleFormat)}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Blank lines after chapter title</label>
          <input
            type="number"
            value={tempSettings.blankLinesAfterChapter}
            {...createNumericInputHandler("blankLinesAfterChapter", 0, 10, false, setTempSettings)}
            className="w-24 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
            min="0"
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="pageBreakAfterChapter"
            checked={tempSettings.pageBreakAfterChapter}
            onChange={(e) => setTempSettings({ ...tempSettings, pageBreakAfterChapter: e.target.checked })}
            className="w-4 h-4 text-[var(--accent)] rounded"
          />
          <label htmlFor="pageBreakAfterChapter" className="text-sm text-[var(--text-primary)]">
            Page break after each chapter
          </label>
        </div>
      </div>

      {/* ── Scene Titles ─────────────────────────────────────────────── */}
      <div className="border-t border-[var(--border)] pt-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Scene Title Format</label>
          <div className="space-y-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
            <label className="flex items-start gap-3 cursor-pointer rounded p-2 hover:bg-[var(--bg-primary)]">
              <input
                type="radio"
                checked={!tempSettings.showSceneTitles}
                onChange={() => setTempSettings((prev) => ({ ...prev, showSceneTitles: false }))}
                className="w-4 h-4 mt-1 text-[var(--accent)]"
              />
              <div>
                <div className="text-sm text-[var(--text-primary)]">Don&apos;t show scene titles</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">No scene titles, but a divider between them.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer rounded p-2 hover:bg-[var(--bg-primary)]">
              <input
                type="radio"
                checked={tempSettings.showSceneTitles}
                onChange={() => setTempSettings((prev) => ({ ...prev, showSceneTitles: true }))}
                className="w-4 h-4 mt-1 text-[var(--accent)]"
              />
              <div>
                <div className="text-sm text-[var(--text-primary)]">Show scene titles</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">Scene title appears at the start of each scene.</div>
              </div>
            </label>
          </div>
        </div>

        {tempSettings.showSceneTitles && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Size (pt)</label>
                <input
                  type="number"
                  value={tempSettings.sceneTitleSize}
                  {...createNumericInputHandler("sceneTitleSize", 6, 72, false, setTempSettings)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  min="6"
                  max="72"
                />
              </div>
              <div>
                <label htmlFor="sceneTitleAlignment" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Alignment</label>
                <select
                  id="sceneTitleAlignment"
                  value={tempSettings.sceneTitleAlignment}
                  onChange={(e) => setTempSettings({ ...tempSettings, sceneTitleAlignment: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Style</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["normal", "bold", "italic", "bold-italic"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer rounded border border-transparent p-2 hover:border-[var(--border)]">
                      <input
                        type="radio"
                        checked={tempSettings.sceneTitleStyle === s}
                        onChange={() => setTempSettings({ ...tempSettings, sceneTitleStyle: s })}
                        className="w-4 h-4 text-[var(--accent)]"
                      />
                      <span className="text-sm text-[var(--text-primary)] capitalize">{s.replace("-", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={16} className="text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Live Preview</span>
              </div>
              <div
                className="rounded p-2"
                style={{
                  fontFamily: tempSettings.defaultFont,
                  fontSize: `${tempSettings.sceneTitleSize}px`,
                  fontWeight: tempSettings.sceneTitleStyle.includes("bold") ? "bold" : "normal",
                  fontStyle: tempSettings.sceneTitleStyle.includes("italic") ? "italic" : "normal",
                  textAlign: tempSettings.sceneTitleAlignment as React.CSSProperties["textAlign"],
                  color: "var(--text-primary)",
                }}
              >
                My Scene Title
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap mt-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Blank lines after scene title</label>
                <input
                  type="number"
                  value={tempSettings.blankLinesAfterSceneTitle}
                  {...createNumericInputHandler("blankLinesAfterSceneTitle", 0, 10, false, setTempSettings)}
                  className="w-24 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="pageBreakAfterSceneTitle"
                  checked={tempSettings.pageBreakAfterSceneTitle}
                  onChange={(e) => setTempSettings({ ...tempSettings, pageBreakAfterSceneTitle: e.target.checked })}
                  className="w-4 h-4 text-[var(--accent)] rounded"
                />
                <label htmlFor="pageBreakAfterSceneTitle" className="text-sm text-[var(--text-primary)]">
                  Page break before each scene
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Extra Chapters ────────────────────────────────────────────── */}
      <div className="border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Extra Chapters</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { id: "includePrologue", label: "Include Prologue" },
            { id: "includeEpilogue", label: "Include Epilogue" },
            { id: "includeAcknowledgements", label: "Include Acknowledgements" },
          ].map(({ id, label }) => {
            const field = id as keyof DocumentSettings;
            return (
              <label key={id} className="flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <input
                  type="checkbox"
                  id={id}
                  checked={tempSettings[field] as boolean}
                  onChange={(e) => setTempSettings((prev) => ({ ...prev, [field]: e.target.checked } as DocumentSettings))}
                  className="w-4 h-4 text-[var(--accent)] rounded"
                />
                <span className="text-sm text-[var(--text-primary)]">{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-5">
      <div className="rounded border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
        <p className="text-sm text-[var(--text-primary)] font-semibold">Advanced template settings</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Template-based styles and automation will be available here in future releases.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <p className="text-sm text-[var(--text-secondary)]">No direct settings yet. This tab is reserved for future templates, chapter presets, and advanced layout options.</p>
        <button
          type="button"
          disabled
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] cursor-not-allowed"
        >
          Apply Advanced
        </button>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "general":
        return renderGeneralTab();
      case "page-layout":
        return renderPageLayoutTab();
      case "typography":
        return renderTypographyTab();
      case "chapter-formatting":
        return renderChapterFormattingTab();
      case "advanced":
        return renderAdvancedTab();
      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Document Settings</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Only the values from the current tab are applied when you use that tab's button. Use Apply All to save all settings from all tabs.</p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 overflow-x-auto" role="tablist" aria-label="Document settings tabs">
            {(Object.keys(TAB_LABELS) as TabId[]).map((tab) => {
              const selected: "true" | "false" = activeTab === tab ? "true" : "false";
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={selected}
                  className={`rounded-lg border px-4 py-2 h-10 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
                    activeTab === tab
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[calc(90vh-164px)] overflow-y-auto px-6 py-5 pb-24">
          <div className="space-y-5">{renderActiveTab()}</div>

          {error && (
            <div className="rounded-xl border border-red-400 bg-red-50 p-4 mt-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="h-10 rounded-lg border border-[var(--border)] px-4 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              Restore to Defaults
            </button>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-lg border border-[var(--border)] px-4 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAll}
                disabled={JSON.stringify(tempSettings) === JSON.stringify(settings)}
                className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)]/90 transition-colors"
              >
                Apply All
              </button>
            </div>
          </div>
        </div>

        {showWarning && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" />
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Apply Document Settings?</h3>
              <p className="text-[var(--text-secondary)] mb-5">
                This will override formatting across the entire document. This action cannot be easily undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWarning(false)}
                  className="rounded border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Apply to Entire Document"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
