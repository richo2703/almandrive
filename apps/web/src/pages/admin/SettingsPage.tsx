import "../../i18n/admin";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { AdminCard } from "../../components/admin/Card";
import { ThemeToggle, useAdminTheme } from "../../components/admin/ThemeToggle";
import { LanguageSwitcher } from "../../components/admin/LanguageSwitcher";
import pkg from "../../../package.json";

export function SettingsPage() {
  const { t, i18n } = useTranslation("translation");
  const [settings, setSettings] = useState<{ adminTelegramIds: string[] } | null>(null);
  const { theme, setTheme } = useAdminTheme();

  useEffect(() => {
    api.adminSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  return (
    <div className="admin-stack">
      <AdminCard title={t("settings.appearance")} subtitle={t("settings.preferencesStored")}>
        <div className="admin-stack">
          <ThemeToggle theme={theme} onChange={setTheme} />
          <LanguageSwitcher />
          <p className="admin-muted">{t("common.language")}: {i18n.language.toUpperCase()}</p>
        </div>
      </AdminCard>
      <AdminCard title={t("settings.account")}>
        <p className="admin-muted">{settings ? settings.adminTelegramIds.join(", ") : t("common.loading")}</p>
      </AdminCard>
      <AdminCard title={t("settings.about")}>
        <p className="admin-muted">{t("settings.version", { version: pkg.version })}</p>
      </AdminCard>
    </div>
  );
}
