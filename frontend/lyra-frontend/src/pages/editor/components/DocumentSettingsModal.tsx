import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { X } from "lucide-react";

interface DocumentSettings {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paperFormat: "A4" | "Letter" | "A5";
  defaultAlignment: "left" | "center" | "right" | "justify";
  defaultFont: string;
  defaultFontSize: number;
}

interface DocumentSettingsModalProps {
  editor: Editor;
  onClose: () => void;
}

const PAPER_FORMATS = {
  A4: { width: 210, height: 297, label: "A4 (210 × 297 mm)" },
  Letter: { width: 215.9, height: 279.4, label: "Letter (8.5 × 11 in)" },
  A5: { width: 148, height: 210, label: "A5 (148 × 210 mm)" },
};

export function DocumentSettingsModal({ editor, onClose }: DocumentSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [settings, setSettings] = useState<DocumentSettings>({
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    paperFormat: "A4",
    defaultAlignment: "left",
    defaultFont: "Arial, sans-serif",
    defaultFontSize: 12,
  });

  const [tempSettings, setTempSettings] = useState<DocumentSettings>(settings);

  // Load settings from localStorage if available
  useEffect(() => {
    const stored = localStorage.getItem("lyra-document-settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
        setTempSettings(parsed);
      } catch (e) {
        console.error("Failed to load document settings:", e);
      }
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSave = () => {
    setShowWarning(true);
  };

  const handleConfirmSave = () => {
    // Save to localStorage
    localStorage.setItem("lyra-document-settings", JSON.stringify(tempSettings));
    setSettings(tempSettings);

    // Apply settings to document
    applyDocumentSettings(tempSettings);

    setShowWarning(false);
    onClose();
  };

  const applyDocumentSettings = (newSettings: DocumentSettings) => {
    // Store settings in editor state/data for future reference
    const editorElement = document.querySelector(".EditorContent");
    if (editorElement) {
      (editorElement as HTMLElement).style.setProperty("--margin-top", `${newSettings.marginTop}mm`);
      (editorElement as HTMLElement).style.setProperty("--margin-bottom", `${newSettings.marginBottom}mm`);
      (editorElement as HTMLElement).style.setProperty("--margin-left", `${newSettings.marginLeft}mm`);
      (editorElement as HTMLElement).style.setProperty("--margin-right", `${newSettings.marginRight}mm`);
    }

    // Apply default font to the whole document
    editor
      .chain()
      .setMark("textStyle", {
        fontFamily: newSettings.defaultFont,
        fontSize: `${newSettings.defaultFontSize}px`,
      })
      .selectAll()
      .run();

    // Reset selection
    editor.chain().focus().run();
  };

  const handleCancel = () => {
    setTempSettings(settings);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between bg-[--bg-secondary] border-b border-[--border] px-6 py-4">
          <h2 className="text-lg font-semibold text-[--text-primary]">Document Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[--bg-primary] rounded transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Paper Format */}
          <div>
            <h3 className="text-sm font-semibold text-[--text-primary] mb-3">Paper Format</h3>
            <div className="space-y-2">
              {(Object.entries(PAPER_FORMATS) as Array<[keyof typeof PAPER_FORMATS, typeof PAPER_FORMATS.A4]>).map(([key, format]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[--bg-primary]">
                  <input
                    type="radio"
                    checked={tempSettings.paperFormat === key}
                    onChange={() => setTempSettings({ ...tempSettings, paperFormat: key })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[--text-primary]">{format.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[--text-primary] mb-2">
                Top Margin (mm)
              </label>
              <input
                type="number"
                value={tempSettings.marginTop}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, marginTop: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 border border-[--border] rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-[--text-primary]"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--text-primary] mb-2">
                Bottom Margin (mm)
              </label>
              <input
                type="number"
                value={tempSettings.marginBottom}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, marginBottom: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 border border-[--border] rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-[--text-primary]"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--text-primary] mb-2">
                Left Margin (mm)
              </label>
              <input
                type="number"
                value={tempSettings.marginLeft}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, marginLeft: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 border border-[--border] rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-[--text-primary]"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--text-primary] mb-2">
                Right Margin (mm)
              </label>
              <input
                type="number"
                value={tempSettings.marginRight}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, marginRight: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 border border-[--border] rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-[--text-primary]"
                min="0"
              />
            </div>
          </div>

          {/* Default Font and Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[--text-primary] mb-2">
                Default Font
              </label>
              <select
                value={tempSettings.defaultFont}
                onChange={(e) => setTempSettings({ ...tempSettings, defaultFont: e.target.value })}
                className="w-full px-3 py-2 border border-[--border] rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-[--text-primary]"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Verdana, Geneva, sans-serif">Verdana</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[--text-primary] mb-2">
                Default Font Size (pt)
              </label>
              <input
                type="number"
                value={tempSettings.defaultFontSize}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, defaultFontSize: Math.max(8, Math.min(72, Number(e.target.value))) })
                }
                className="w-full px-3 py-2 border border-[--border] rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-[--text-primary]"
                min="8"
                max="72"
              />
            </div>
          </div>

          {/* Default Alignment */}
          <div>
            <h3 className="text-sm font-semibold text-[--text-primary] mb-3">Default Alignment</h3>
            <div className="grid grid-cols-4 gap-2">
              {(["left", "center", "right", "justify"] as const).map((align) => (
                <label key={align} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[--bg-primary]">
                  <input
                    type="radio"
                    checked={tempSettings.defaultAlignment === align}
                    onChange={() => setTempSettings({ ...tempSettings, defaultAlignment: align })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[--text-primary] capitalize">{align}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Note:</strong> Applying these settings will update the entire document's formatting to match the default values you set here.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 bg-[--bg-secondary] border-t border-[--border] px-6 py-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded border border-[--border] text-[--text-primary] hover:bg-[--bg-primary] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Apply Settings
          </button>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-[--text-primary] mb-3">Apply Document Settings?</h3>
            <p className="text-[--text-secondary] mb-6">
              This will override the formatting of the entire document. This action cannot be easily undone. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 rounded border border-[--border] text-[--text-primary] hover:bg-[--bg-primary] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Apply to Entire Document
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
