import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "./components/Layout";
import { useApp } from "./context/AppContext";
import { HomePage } from "./pages/HomePage";
import { LanguagePage } from "./pages/LanguagePage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { LearnPage } from "./pages/LearnPage";
import { QuestionPage } from "./pages/QuestionPage";
import { ExamPage } from "./pages/ExamPage";
import { BookmarksPage, MistakesPage } from "./pages/CollectionPages";
import { StatisticsPage } from "./pages/StatisticsPage";
import { PremiumPage } from "./pages/PremiumPage";
import { PricingPage } from "./pages/PricingPage";
import { ProfilePage } from "./pages/ProfilePage";
import {
  AdminLayout,
  AdminBannersPage,
  AdminDashboardPage,
  AdminNewsPage,
  AdminOrdersPage,
  AdminProductsPage,
  AdminPromotionsPage,
  AdminPromoCodesPage,
  AdminSettingsPage,
  AdminUsersPage,
} from "./pages/AdminPages";

function TitleSync() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      const section = location.pathname.split("/").filter(Boolean)[1];
      const suffix = section ? ` · ${section.charAt(0).toUpperCase()}${section.slice(1)}` : "";
      document.title = `Alman Drive Admin${suffix}`;
    } else if (location.pathname === "/profile") {
      document.title = "Alman Drive · Profile";
    } else if (location.pathname === "/pricing") {
      document.title = "Alman Drive Pricing";
    } else {
      document.title = "Alman Drive";
    }
  }, [location.pathname]);
  return null;
}

export function App() {
  const { ready, error, t } = useApp();
  if (!ready) return <div className="splash"><span className="splash__mark">TD</span><p>{t("app.loading")}</p></div>;
  if (error) return <div className="splash splash--error"><strong>{t("app.openError")}</strong><p>{error}</p><small>{t("app.devHint")}</small></div>;
  return (
    <BrowserRouter>
      <TitleSync />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/language" element={<LanguagePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/question/:id" element={<QuestionPage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/premium" element={<PremiumPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="promo-codes" element={<AdminPromoCodesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="banners" element={<AdminBannersPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="news" element={<AdminNewsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
