//specialSections.ts
import type { DocumentSettings } from "../context/DocumentSettingsContext";
import type { Chapter, DocumentOutline } from "../../../types/document";

export type SpecialSectionKey = "prologue" | "epilogue" | "acknowledgements";

export interface SpecialSectionMeta {
  key: SpecialSectionKey;
  title: string;
  settingKey: keyof DocumentSettings;
}

export const SPECIAL_SECTIONS: SpecialSectionMeta[] = [
  { key: "prologue", title: "Prologue", settingKey: "includePrologue" },
  { key: "epilogue", title: "Epilogue", settingKey: "includeEpilogue" },
  { key: "acknowledgements", title: "Acknowledgements", settingKey: "includeAcknowledgements" },
];

export function normalizeSpecialSectionTitle(title: string): SpecialSectionKey | null {
  const normalized = title.trim().toLowerCase();
  return SPECIAL_SECTIONS.find((section) => section.key === normalized)?.key ?? null;
}

export function isSpecialSectionTitle(title: string): boolean {
  return normalizeSpecialSectionTitle(title) !== null;
}

export function getReorderedOutline(outline: DocumentOutline, settings: DocumentSettings): DocumentOutline {
  const existingSections = new Map<SpecialSectionKey, Chapter>();
  const normalChapters: Chapter[] = [];

  outline.chapters.forEach((chapter) => {
    const specialKey = normalizeSpecialSectionTitle(chapter.title);
    if (specialKey) {
      existingSections.set(specialKey, chapter);
    } else {
      normalChapters.push(chapter);
    }
  });

  // Build the canonical display order: Prologue → normal chapters → Epilogue → Acknowledgements.
  // Only include a special section if it is both enabled AND already exists in the backend.
  // Never insert placeholder objects — if the backend chapter doesn't exist yet the sync
  // effect will create it and reloadOutline will re-trigger this function.
  const reordered: Chapter[] = [];

  if (settings.includePrologue && existingSections.has("prologue")) {
    reordered.push(existingSections.get("prologue")!);
  }
  reordered.push(...normalChapters);
  if (settings.includeEpilogue && existingSections.has("epilogue")) {
    reordered.push(existingSections.get("epilogue")!);
  }
  if (settings.includeAcknowledgements && existingSections.has("acknowledgements")) {
    reordered.push(existingSections.get("acknowledgements")!);
  }

  return {
    ...outline,
    chapters: reordered,
  };
}

// getVisibleOutline returns chapters in canonical display order with disabled
// special sections omitted. getReorderedOutline already enforces both conditions
// (enabled + exists in backend), so this is a direct alias.
export function getVisibleOutline(outline: DocumentOutline, settings: DocumentSettings): DocumentOutline {
  return getReorderedOutline(outline, settings);
}

export function getEnabledSpecialSectionKeys(settings: DocumentSettings): SpecialSectionKey[] {
  return SPECIAL_SECTIONS.filter((section) => settings[section.settingKey] as boolean).map((section) => section.key);
}

export function getMissingEnabledSpecialSections(outline: DocumentOutline, settings: DocumentSettings): SpecialSectionMeta[] {
  const normalizedTitles = new Set(outline.chapters.map((chapter) => chapter.title.trim().toLowerCase()));
  return SPECIAL_SECTIONS.filter(
    (section) => (settings[section.settingKey] as boolean) && !normalizedTitles.has(section.title.toLowerCase())
  );
}

export function getExistingSpecialChaptersWithoutScenes(outline: DocumentOutline): Chapter[] {
  return outline.chapters.filter(
    (chapter) => normalizeSpecialSectionTitle(chapter.title) !== null && chapter.scenes.length === 0
  );
}

export function getSpecialSectionSettingKey(title: string): keyof DocumentSettings | null {
  const key = normalizeSpecialSectionTitle(title);
  if (!key) return null;
  return SPECIAL_SECTIONS.find((section) => section.key === key)?.settingKey ?? null;
}
