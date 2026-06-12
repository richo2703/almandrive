import { BarChart3, Bookmark, BookOpen, House, TriangleAlert } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Brand } from "./Brand";
import { useApp } from "../context/AppContext";

const navItems = [
  ["/", "nav.home", House],
  ["/learn", "nav.learn", BookOpen],
  ["/mistakes", "nav.mistakes", TriangleAlert],
  ["/bookmarks", "nav.saved", Bookmark],
  ["/statistics", "nav.statistics", BarChart3],
] as const;

export function Layout() {
  const { t } = useApp();
  return (
    <div className="app-shell">
      <header className="topbar"><Brand compact /></header>
      <main className="page"><Outlet /></main>
      <nav className="bottom-nav" aria-label={t("nav.primary")}>
        {navItems.map(([to, labelKey, Icon]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => isActive ? "active" : ""}>
            <Icon size={20} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
