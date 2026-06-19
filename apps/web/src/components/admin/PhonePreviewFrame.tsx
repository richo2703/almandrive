import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function PhonePreviewFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation("translation");
  return (
    <div className="phone-preview">
      <div className="phone-preview__header">
        <span />
        <span />
        <span />
      </div>
      <div className="phone-preview__screen">
        <div className="phone-preview__label">{t("preview.phone")}</div>
        {children}
      </div>
    </div>
  );
}
