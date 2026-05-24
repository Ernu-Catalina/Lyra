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

  const reordered: Chapter[] = [];

  if (settings.includePrologue) {
    reordered.push(
      existingSections.get("prologue") ?? {
        id: "__prologue__",
        title: "Prologue",
        order: 0,
        wordcount: 0,
        scenes: [],
      }
    );
  }
  reordered.push(...normalChapters);
  if (settings.includeEpilogue) {
    reordered.push(
      existingSections.get("epilogue") ?? {
        id: "__epilogue__",
        title: "Epilogue",
        order: normalChapters.length,
        wordcount: 0,
        scenes: [],
      }
    );
  }
  if (settings.includeAcknowledgements) {
    reordered.push(
      existingSections.get("acknowledgements") ?? {
        id: "__acknowledgements__",
        title: "Acknowledgements",
        order: normalChapters.length + (settings.includeEpilogue ? 1 : 0),
        wordcount: 0,
        scenes: [],
      }
    );
  }

  return {
    ...outline,
    chapters: reordered,
  };
}

export function getVisibleOutline(outline: DocumentOutline, settings: DocumentSettings): DocumentOutline {
  const reordered = getReorderedOutline(outline, settings);
  // Filter out any special chapter whose setting is disabled.
  // getReorderedOutline only includes enabled ones, but the raw outline still
  // has the persisted chapters — filtering here ensures disabled chapters are
  // invisible in the sidebar/editor without deleting them from the backend.
  const enabledKeys = new Set(getEnabledSpecialSectionKeys(settings));
  const filteredChapters = reordered.chapters.filter((chapter) => {
    const specialKey = normalizeSpecialSectionTitle(chapter.title);
    if (!specialKey) return true; // normal chapter, always show
    return enabledKeys.has(specialKey);
  });
  return { ...reordered, chapters: filteredChapters };
}

export function getDisabledSpecialSections(outline: DocumentOutline, settings: DocumentSettings): Chapter[] {
  return outline.chapters.filter((chapter) => {
    const specialKey = normalizeSpecialSectionTitle(chapter.title);
    if (!specialKey) return false;
    return !(settings[SPECIAL_SECTIONS.find((s) => s.key === specialKey)!.settingKey] as boolean);
  });
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
