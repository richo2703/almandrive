import { BrowserRouter, Route, Routes } from "react-router-dom";
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

export function App() {
  const { ready, error, t } = useApp();
  if (!ready) return <div className="splash"><span className="splash__mark">TD</span><p>{t("app.loading")}</p></div>;
  if (error) return <div className="splash splash--error"><strong>{t("app.openError")}</strong><p>{error}</p><small>{t("app.devHint")}</small></div>;
  return (
    <BrowserRouter>
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
          <Route path="/premium" element={<PremiumPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
