import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { el } from "./locales/el";
import { en, type TranslationDictionary, type TranslationKey } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { hr } from "./locales/hr";
import { it } from "./locales/it";
import { pl } from "./locales/pl";
import { pt } from "./locales/pt";
import { ro } from "./locales/ro";
import { ru } from "./locales/ru";
import { tr } from "./locales/tr";
import { uz } from "./locales/uz";

export const supportedLanguages = [
  "de", "en", "ru", "tr", "uz", "ar", "ro", "pl", "hr", "pt", "es", "it", "fr", "el",
] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export type TranslationParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;

const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  de, en, ru, tr, uz, ar, ro, pl, hr, pt, es, it, fr, el,
};

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}

export function translate(
  language: SupportedLanguage,
  key: TranslationKey,
  params: TranslationParams = {},
) {
  const template = dictionaries[language][key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
