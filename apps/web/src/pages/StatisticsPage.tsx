import { Award, BookOpen, CheckCircle2, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Statistics } from "../lib/api";
import { useApp } from "../context/AppContext";

export function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const { t } = useApp();
  useEffect(() => { api.statistics().then(setStats); }, []);
  if (!stats) return <div className="loading">{t("statistics.loading")}</div>;
  return (
    <section>
      <p className="eyebrow">{t("statistics.eyebrow")}</p>
      <h1>{t("statistics.title")}</h1>
      <div className="stat-hero">
        <span>{stats.accuracy}%</span>
        <div><strong>{t("statistics.accuracy")}</strong><p>{t("statistics.basedOn", { count: stats.totalAnswers })}</p></div>
      </div>
      <div className="stat-grid">
        <div><BookOpen /><strong>{stats.questionsSeen}</strong><span>{t("statistics.questionsSeen")}</span></div>
        <div><CheckCircle2 /><strong>{stats.correctAnswers}</strong><span>{t("statistics.correctAnswers")}</span></div>
        <div><Target /><strong>{stats.totalAnswers - stats.correctAnswers}</strong><span>{t("statistics.reviewItems")}</span></div>
        <div><Award /><strong>{stats.recentExams.length}</strong><span>{t("statistics.recentExams")}</span></div>
      </div>
      <h2>{t("statistics.recentExams")}</h2>
      <div className="row-list">
        {stats.recentExams.length ? stats.recentExams.map((exam) => (
          <div className="exam-row" key={exam.id}>
            <span className="tag">{t("common.category", { category: exam.category.code })}</span>
            <strong>{exam.score}/{exam.totalQuestions}</strong>
            <small>{new Date(exam.finishedAt).toLocaleDateString()}</small>
          </div>
        )) : <div className="empty-state">{t("statistics.noExams")}</div>}
      </div>
    </section>
  );
}
