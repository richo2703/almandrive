import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function PhonePreviewFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation("translation");
  const [language, setLanguage] = useState("ru");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  return (
    <div className="phone-preview-wrap">
      <div className="phone-preview-toolbar">
        <div className="admin-segmented" aria-label={t("preview.language")}>
          {["ru", "en", "de"].map((code) => (
            <button className={language === code ? "is-active" : ""} key={code} type="button" onClick={() => setLanguage(code)}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="admin-segmented" aria-label={t("preview.theme")}>
          {(["light", "dark"] as const).map((value) => (
            <button className={theme === value ? "is-active" : ""} key={value} type="button" onClick={() => setTheme(value)}>
              {t(`theme.${value}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="phone-preview">
        <div className="phone-preview__bezel">
          <span />
        </div>
        <div className={`phone-preview__screen is-${theme}`} data-preview-language={language}>
          <div className="phone-preview__status">
            <span>9:41</span>
            <span>{t("preview.telegram")}</span>
          </div>
          <div className="phone-preview__content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
