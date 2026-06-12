import {
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpen,
  Crown,
  Languages,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

export function HomePage() {
  const { firstName, category, t } = useApp();
  const currentCategory = category || t("home.chooseCategory");
  return (
    <>
      <section className="welcome">
        <p className="eyebrow">{t("home.greeting", { name: firstName })}</p>
        <h1>{t("home.title")}</h1>
        <p>{t("home.intro")}</p>
      </section>
      <section className="focus-panel">
        <div>
          <span className="tag">{t("common.category", { category: currentCategory })}</span>
          <h2>{t("home.continue")}</h2>
          <p>{t("home.continueDescription")}</p>
        </div>
        <Link to="/learn" className="round-action" aria-label={t("home.continue")}><ArrowRight /></Link>
      </section>
      <div className="action-grid">
        <Link to="/learn" className="action-tile"><BookOpen /><strong>{t("home.startLearning")}</strong><span>{t("home.learnDescription")}</span></Link>
        <Link to="/exam" className="action-tile action-tile--dark"><Timer /><strong>{t("home.exam")}</strong><span>{t("home.examDescription")}</span></Link>
      </div>
      <section className="menu-list">
        <Link to="/mistakes"><TriangleAlert /><span><strong>{t("mistakes.title")}</strong><small>{t("home.mistakesDescription")}</small></span><ArrowRight /></Link>
        <Link to="/bookmarks"><Bookmark /><span><strong>{t("home.bookmarks")}</strong><small>{t("home.bookmarksDescription")}</small></span><ArrowRight /></Link>
        <Link to="/statistics"><BarChart3 /><span><strong>{t("statistics.title")}</strong><small>{t("home.statisticsDescription")}</small></span><ArrowRight /></Link>
        <Link to="/language"><Languages /><span><strong>{t("home.language")}</strong><small>{t("home.languageDescription")}</small></span><ArrowRight /></Link>
        <Link to="/categories"><BookOpen /><span><strong>{t("home.categories")}</strong><small>{t("home.categoryDescription", { category: currentCategory })}</small></span><ArrowRight /></Link>
        <Link to="/premium"><Crown /><span><strong>{t("home.premium")}</strong><small>{t("home.comingSoon")}</small></span><ArrowRight /></Link>
      </section>
    </>
  );
}
