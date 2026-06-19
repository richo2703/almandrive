import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import de from "./de.json";
import ru from "./ru.json";

export const adminLanguages = ["en", "ru", "de"] as const;
export type AdminLanguage = (typeof adminLanguages)[number];

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  de: { translation: de },
} as const;

const stored = localStorage.getItem("alman_admin_lang");
const initialLanguage: AdminLanguage =
  stored && (adminLanguages as readonly string[]).includes(stored) ? (stored as AdminLanguage) : "en";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export function getAdminLanguage() {
  return (i18n.language as AdminLanguage) || initialLanguage;
}

export function setAdminLanguage(language: AdminLanguage) {
  localStorage.setItem("alman_admin_lang", language);
  void i18n.changeLanguage(language);
}

export function isAdminLanguage(value: string): value is AdminLanguage {
  return (adminLanguages as readonly string[]).includes(value);
}

export default i18n;
