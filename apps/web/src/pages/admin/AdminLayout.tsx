import "../../i18n/admin";
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { AdminSidebar } from "../../components/admin/Sidebar";
import { Topbar } from "../../components/admin/Topbar";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";

export function AdminLayout() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = `${t("layout.title")} · ${t("layout.subtitle")}`;
  }, [t]);

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  async function logout() {
    await api.adminLogout();
    window.location.href = "/admin/login";
  }

  return (
    <div className="admin-app">
      <Toaster richColors position="top-right" />
      <AdminSidebar onLogout={logout} />
      <section className="admin-main">
        <Topbar query={query} onChange={setQuery} />
        <main className="admin-main__content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
