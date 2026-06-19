import { LayoutDashboard, Megaphone, Newspaper, Package, Settings, ShoppingCart, Tag, Users, Image as ImageIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ThemeToggle, useAdminTheme } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AdminButton } from "./Button";

const navItems = [
  ["/admin", "nav.dashboard", LayoutDashboard],
  ["/admin/products", "nav.products", Package],
  ["/admin/promo-codes", "nav.promoCodes", Tag],
  ["/admin/users", "nav.users", Users],
  ["/admin/orders", "nav.orders", ShoppingCart],
  ["/admin/banners", "nav.banners", ImageIcon],
  ["/admin/promotions", "nav.promotions", Megaphone],
  ["/admin/news", "nav.news", Newspaper],
  ["/admin/settings", "nav.settings", Settings],
] as const;

export function AdminSidebar({ onLogout }: { onLogout(): void }) {
  const { t } = useTranslation("translation");
  const { theme, setTheme } = useAdminTheme();

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <p className="admin-eyebrow">Admin</p>
        <h1>{t("layout.title")}</h1>
        <p>{t("layout.subtitle")}</p>
      </div>

      <nav className="admin-nav">
        {navItems.map(([to, labelKey, Icon]) => (
          <NavLink key={to} to={to} end={to === "/admin"} className={({ isActive }) => `admin-nav__item ${isActive ? "is-active" : ""}`}>
            <Icon size={18} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <ThemeToggle theme={theme} onChange={setTheme} />
        <LanguageSwitcher />
        <AdminButton variant="secondary" type="button" onClick={onLogout}>
          {t("common.signOut")}
        </AdminButton>
      </div>
    </aside>
  );
}
