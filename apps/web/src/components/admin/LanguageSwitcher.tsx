import { useTranslation } from "react-i18next";
import { adminLanguages, setAdminLanguage, type AdminLanguage } from "../../i18n/admin";
import { Select } from "./Select";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation("translation");
  const value = (i18n.language as AdminLanguage) || "en";
  return (
    <Select
      label={t("common.language")}
      value={value}
      onChange={(next) => setAdminLanguage(next as AdminLanguage)}
      options={adminLanguages.map((language) => ({ value: language, label: language.toUpperCase() }))}
    />
  );
}
