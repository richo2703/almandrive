import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const storageKey = "alman_admin_theme";

export type AdminTheme = "dark" | "light";

function getInitialTheme(): AdminTheme {
  const stored = localStorage.getItem(storageKey);
  return stored === "light" ? "light" : "dark";
}

export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => {
      const next = getInitialTheme();
      setTheme(next);
      document.documentElement.dataset.adminTheme = next;
    };
    window.addEventListener("storage", syncTheme);
    window.addEventListener("alman-admin-theme", syncTheme as EventListener);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("alman-admin-theme", syncTheme as EventListener);
    };
  }, []);

  function update(next: AdminTheme) {
    setTheme(next);
    localStorage.setItem(storageKey, next);
    document.documentElement.dataset.adminTheme = next;
    window.dispatchEvent(new Event("alman-admin-theme"));
  }

  return { theme, setTheme: update };
}

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: AdminTheme;
  onChange(value: AdminTheme): void;
}) {
  const { t } = useTranslation("translation");
  return (
    <button type="button" className="admin-switch" onClick={() => onChange(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <MoonStar size={16} /> : <SunMedium size={16} />}
      <span>{theme === "dark" ? t("theme.dark") : t("theme.light")}</span>
    </button>
  );
}
