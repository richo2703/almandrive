import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ApiError, api, type Topic } from "../lib/api";

export function LearnPage() {
  const { category, t } = useApp();
  const [access, setAccess] = useState<boolean | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [mode, setMode] = useState<"choice" | "topic">("choice");
  const navigate = useNavigate();
  useEffect(() => {
    if (!category) {
      navigate("/categories", { replace: true });
      return;
    }
    if (access === null) {
      api.access().then((result) => {
        if (!result.hasActiveAccess) {
          navigate("/pricing", { replace: true });
          return;
        }
        setAccess(true);
      }).catch(() => navigate("/pricing", { replace: true }));
      return;
    }
    if (mode !== "topic" || topics.length) return;
    api.topics()
      .then(setTopics)
      .catch((error: unknown) => setPageError(error instanceof Error ? error.message : "Failed to load topics."));
  }, [access, category, mode, navigate, topics.length]);

  async function start(topic?: string) {
    setLoading(topic ?? "all");
    setPageError(null);
    try {
      const question = await api.nextQuestion(category, topic);
      navigate(`/question/${question.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "NO_QUESTIONS") {
        if (topic) {
          const selectedTopic = topics.find((item) => item.slug === topic)?.name ?? topic;
          setPageError(t("learn.noTopicQuestions", { topic: selectedTopic }));
        } else {
          setPageError(t("learn.noQuestions"));
        }
        return;
      }
      setPageError(error instanceof Error ? error.message : "Failed to start learning.");
    } finally {
      setLoading(null);
    }
  }

  if (!category) return <div className="loading">{t("common.loading")}</div>;
  if (access === null) return <div className="loading">{t("common.loading")}</div>;

  return (
    <section>
      <p className="eyebrow">{t("common.category", { category })}</p>
      <h1>{t("learn.title")}</h1>
      <p className="page-intro">
        {mode === "choice" ? t("learn.intro") : t("learn.topicIntro")}
      </p>
      {pageError && (
        <div className="empty-state">
          <p>{pageError}</p>
          <button className="button button--muted" onClick={() => setMode("choice")}>{t("learn.backToChoice")}</button>
        </div>
      )}
      {mode === "choice" ? (
        <div className="category-grid">
          <button className="focus-panel focus-panel--button" onClick={() => start()} disabled={Boolean(loading)}>
            <span>
              <span className="tag">{t("learn.mixed")}</span>
              <strong>{t("learn.allMixedQuestions")}</strong>
              <small>{t("learn.balanced", { category })}</small>
            </span>
            <ArrowRight />
          </button>
          <button className="focus-panel focus-panel--button" onClick={() => setMode("topic")} disabled={Boolean(loading)}>
            <span>
              <span className="tag">{t("learn.topicMode")}</span>
              <strong>{t("learn.byTopic")}</strong>
              <small>{t("learn.topicModeDescription")}</small>
            </span>
            <ArrowRight />
          </button>
        </div>
      ) : (
        <>
          <button className="button button--muted" onClick={() => { setPageError(null); setMode("choice"); }}>{t("learn.backToChoice")}</button>
          <div className="topic-list">
            {topics.map((topic, index) => (
              <button key={topic.id} onClick={() => start(topic.slug)} disabled={Boolean(loading)}>
                <span className="topic-number">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{topic.name}</strong>
                  <small>{loading === topic.slug ? t("common.loading") : t("learn.startFocused")}</small>
                </span>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
