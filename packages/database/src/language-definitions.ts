export type DatabaseLanguageDefinition = {
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isContentActive: boolean;
};

export const databaseLanguageDefinitions: DatabaseLanguageDefinition[] = [
  { code: "de", name: "German", nativeName: "Deutsch", isRtl: false, isContentActive: true },
  { code: "en", name: "English", nativeName: "English", isRtl: false, isContentActive: true },
  { code: "ru", name: "Russian", nativeName: "Русский", isRtl: false, isContentActive: true },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", isRtl: false, isContentActive: true },
  { code: "uz", name: "Uzbek", nativeName: "O‘zbekcha", isRtl: false, isContentActive: true },
  { code: "ar", name: "Arabic", nativeName: "العربية", isRtl: true, isContentActive: false },
  { code: "ro", name: "Romanian", nativeName: "Română", isRtl: false, isContentActive: false },
  { code: "pl", name: "Polish", nativeName: "Polski", isRtl: false, isContentActive: false },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", isRtl: false, isContentActive: false },
  { code: "pt", name: "Portuguese", nativeName: "Português", isRtl: false, isContentActive: false },
  { code: "es", name: "Spanish", nativeName: "Español", isRtl: false, isContentActive: false },
  { code: "it", name: "Italian", nativeName: "Italiano", isRtl: false, isContentActive: false },
  { code: "fr", name: "French", nativeName: "Français", isRtl: false, isContentActive: false },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", isRtl: false, isContentActive: false },
] as const;

export const contentLanguageCodes = databaseLanguageDefinitions
  .filter((language) => language.isContentActive)
  .map((language) => language.code);
