import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ApiQuestion } from "@theorie-direkt/shared";
import { api, type AnswerResult } from "../lib/api";
import { QuestionView } from "../components/QuestionView";
import { useApp } from "../context/AppContext";

export function QuestionPage() {
  const { id } = useParams();
  const { category, t } = useApp();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<ApiQuestion | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) {
      navigate("/categories", { replace: true });
      return;
    }
    if (id) api.question(id).then(setQuestion).catch(() => navigate("/learn"));
  }, [category, id, navigate]);

  if (!category) return <div className="loading">{t("common.loading")}</div>;

  if (error) {
    return (
      <section className="empty-state">
        <p>{error}</p>
        <button className="button button--muted" onClick={() => navigate("/learn")}>{t("home.startLearning")}</button>
      </section>
    );
  }

  if (!question) return <div className="loading">{t("question.loading")}</div>;

  async function next() {
    const nextQuestion = await api.nextQuestion(category);
    setResult(null);
    navigate(`/question/${nextQuestion.id}`);
  }

  return (
    <>
      <QuestionView
        key={question.id}
        question={question}
        result={result}
        busy={busy}
        onSubmit={async (optionIds) => {
          setBusy(true);
          try { setResult(await api.answer(question.id, optionIds)); }
          catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save answer.");
          } finally { setBusy(false); }
        }}
        onBookmark={async () => {
          const response = await api.bookmark(question.id);
          setQuestion({ ...question, bookmarked: response.bookmarked });
        }}
      />
      {result && <button className="button button--primary button--full" onClick={next}>{t("question.next")} <ArrowRight size={18} /></button>}
    </>
  );
}
