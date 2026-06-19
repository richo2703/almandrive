import { useTranslation } from "react-i18next";
import { adminLanguages, setAdminLanguage, type AdminLanguage } from "../../i18n/admin";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation("translation");
  const value = (i18n.language as AdminLanguage) || "en";
  return (
    <label className="admin-switch admin-switch--select">
      <span>{t("common.language")}</span>
      <select
        value={value}
        onChange={(event) => setAdminLanguage(event.target.value as AdminLanguage)}
      >
        {adminLanguages.map((language) => (
          <option key={language} value={language}>
            {language.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
