import type { DocumentSettings } from "../context/DocumentSettingsContext";
import type { CSSProperties } from "react";

export function formatChapterTitle(
  chapterNumber: number,
  chapterTitle: string,
  settings: DocumentSettings
): { html: string; style: React.CSSProperties } {
  if (settings.chapterTitleFormat === "none") {
    return { html: "", style: {} };
  }

  let displayText = "";
  switch (settings.chapterTitleFormat) {
    case "chapter-number":
      displayText = `Chapter ${chapterNumber}`;
      break;
    case "chapter-number-title":
      displayText = `Chapter ${chapterNumber}: ${chapterTitle}`;
      break;
    case "number-title":
      displayText = `${chapterNumber}. ${chapterTitle}`;
      break;
    case "title-only":
      displayText = chapterTitle;
      break;
    default:
      displayText = chapterTitle;
  }

const style = {
  fontFamily: settings.defaultFont,
  fontSize: `${settings.chapterTitleSize}px`,
  fontWeight: settings.chapterTitleStyle.includes("bold") ? "bold" : "normal",
  fontStyle: settings.chapterTitleStyle.includes("italic") ? "italic" : "normal",
  textAlign: settings.chapterTitleAlignment,
  pageBreakAfter: settings.pageBreakAfterChapter ? "always" : "avoid",
  marginBottom: "1.5em",
};

  return { html: displayText, style };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getChapterTitleHTML(
  chapterNumber: number,
  chapterTitle: string,
  settings: DocumentSettings
): string {
  if (settings.chapterTitleFormat === "none") {
    return "";
  }

  const { html, style } = formatChapterTitle(chapterNumber, chapterTitle, settings);

  const styleStr = Object.entries(style)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join(" ");

  return `<div style="${styleStr}">${escapeHtml(html)}</div>`;
}
