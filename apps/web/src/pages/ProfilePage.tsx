import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type UserProgress } from "../lib/api";
import { useApp } from "../context/AppContext";

function ProgressBar({ value, total }: { value: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="progress-line" aria-label={`${percent}%`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

export function ProfilePage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState<UserProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.meProgress()
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Failed to load profile."));
  }, []);

  const activeAccess = data?.access;
  const totalAnswered = data?.statistics.totalAnswers ?? 0;
  const correct = data?.statistics.correctAnswers ?? 0;
  const wrong = data?.statistics.wrongAnswers ?? totalAnswered - correct;
  const success = totalAnswered ? Math.round((correct / totalAnswered) * 100) : 0;
  const lastSession = data?.lastSession;
  const sessionModeLabels = {
    PRACTICE: t("profile.mode.practice"),
    EXAM: t("profile.mode.exam"),
    MISTAKES: t("profile.mode.mistakes"),
    SAVED: t("profile.mode.saved"),
  } as const;

  const categoryCards = useMemo(() => data?.categoryProgress ?? [], [data]);
  const topicCards = useMemo(() => data?.topicProgress ?? [], [data]);

  if (error) {
    return <section className="empty-state"><p>{error}</p></section>;
  }
  if (!data) return <div className="loading">{t("common.loading")}</div>;

  return (
    <section>
      <p className="eyebrow">{t("profile.eyebrow")}</p>
      <h1>{t("profile.title")}</h1>
      <p className="page-intro">{t("profile.intro")}</p>

      <section className="focus-panel">
        <div>
          <span className="tag">{t("profile.identity")}</span>
          <h2>{data.user.firstName ?? data.user.username ?? data.user.telegramId}</h2>
          <p>@{data.user.username ?? "—"} · {data.user.telegramId}</p>
          <p>{data.user.lastName ?? ""}</p>
        </div>
        <button className="button button--primary" onClick={() => navigate("/pricing")}>
          {activeAccess?.hasActiveAccess ? t("profile.manageAccess") : t("profile.buyAccess")}
        </button>
      </section>

      <div className="stat-grid">
        <div><strong>{totalAnswered}</strong><span>{t("profile.totalAnswered")}</span></div>
        <div><strong>{correct}</strong><span>{t("profile.correctAnswers")}</span></div>
        <div><strong>{wrong}</strong><span>{t("profile.wrongAnswers")}</span></div>
        <div><strong>{success}%</strong><span>{t("profile.successRate")}</span></div>
        <div><strong>{data.savedCount}</strong><span>{t("profile.savedQuestions")}</span></div>
        <div><strong>{data.mistakeCount}</strong><span>{t("profile.mistakes")}</span></div>
      </div>

      <section className="card-grid">
        <article className="card">
          <span className="tag">{t("profile.accessStatus")}</span>
          <strong>{activeAccess?.hasActiveAccess ? t("pricing.accessActive") : t("pricing.accessInactive")}</strong>
          <p>
            {activeAccess?.hasActiveAccess
              ? activeAccess.isLifetime
                ? t("pricing.lifetimeAccess")
                : activeAccess.accessUntil
                  ? t("pricing.accessUntil", { date: new Date(activeAccess.accessUntil).toLocaleDateString() })
                  : t("pricing.noAccess")
              : t("pricing.noAccess")}
          </p>
        </article>
        <article className="card">
          <span className="tag">{t("profile.language")}</span>
          <strong>{data.user.interfaceLanguage}</strong>
          <p>{data.user.languageCode ?? "—"}</p>
        </article>
        <article className="card">
          <span className="tag">{t("profile.resume")}</span>
          <strong>{lastSession ? sessionModeLabels[lastSession.mode] : t("profile.noSession")}</strong>
          <p>{lastSession ? t("profile.questionsCount", { count: lastSession.totalQuestions }) : t("profile.noSessionHint")}</p>
        </article>
      </section>

      <section>
        <h2>{t("profile.categoryProgress")}</h2>
        <div className="selection-list">
          {categoryCards.map((item) => (
            <article className="selection-list__card" key={item.categoryId}>
              <div className="question-row">
                <div>
                  <strong>{item.categoryName}</strong>
                  <small>{item.answeredQuestions} / {item.totalQuestions}</small>
                </div>
                <span className="tag">{item.completed ? t("profile.completed") : t("profile.inProgress")}</span>
              </div>
              <ProgressBar value={item.answeredQuestions} total={item.totalQuestions} />
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>{t("profile.topicProgress")}</h2>
        <div className="selection-list">
          {topicCards.map((item) => (
            <article className="selection-list__card" key={item.topicId}>
              <div className="question-row">
                <div>
                  <strong>{item.topicName}</strong>
                  <small>{item.answeredQuestions} / {item.totalQuestions}</small>
                </div>
                <span className="tag">{item.completedAt ? t("profile.completed") : t("profile.inProgress")}</span>
              </div>
              <ProgressBar value={item.answeredQuestions} total={item.totalQuestions} />
            </article>
          ))}
        </div>
      </section>

      <section className="menu-list">
        <Link to="/statistics"><span><strong>{t("statistics.title")}</strong><small>{t("profile.statsHint")}</small></span></Link>
        <Link to="/mistakes"><span><strong>{t("mistakes.title")}</strong><small>{t("profile.mistakesHint")}</small></span></Link>
        <Link to="/bookmarks"><span><strong>{t("bookmarks.title")}</strong><small>{t("profile.savedHint")}</small></span></Link>
      </section>
    </section>
  );
}
