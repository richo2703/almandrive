import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ApiQuestion } from "@theorie-direkt/shared";
import { ApiError, api, type AnswerResult } from "../lib/api";
import { QuestionView } from "../components/QuestionView";
import { useApp } from "../context/AppContext";

export function QuestionPage() {
  const { id } = useParams();
  const location = useLocation();
  const { category, t } = useApp();
  const navigate = useNavigate();
  const sessionId = (location.state as { sessionId?: string } | null)?.sessionId ?? null;
  const [access, setAccess] = useState<boolean | null>(null);
  const [question, setQuestion] = useState<ApiQuestion | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [sessionNextQuestion, setSessionNextQuestion] = useState<ApiQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }).catch((error: unknown) => {
        if (error instanceof ApiError && error.code === "payment_required") {
          navigate("/pricing", { replace: true });
          return;
        }
        navigate("/pricing", { replace: true });
      });
      return;
    }
    if (id) api.question(id).then(setQuestion).catch((error: unknown) => {
      if (error instanceof ApiError && error.code === "payment_required") {
        navigate("/pricing", { replace: true });
        return;
      }
      navigate("/learn");
    });
  }, [access, category, id, navigate]);

  if (!category) return <div className="loading">{t("common.loading")}</div>;
  if (access === null) return <div className="loading">{t("common.loading")}</div>;

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
    if (sessionId && sessionNextQuestion) {
      setResult(null);
      setQuestion(sessionNextQuestion);
      setSessionNextQuestion(null);
      navigate(`/question/${sessionNextQuestion.id}`, { state: { sessionId } });
      return;
    }
    if (sessionId && question) {
      const summary = await api.finishQuizSession(sessionId);
      navigate("/statistics", { state: { examSummary: summary } });
      return;
    }
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
          try {
            if (sessionId) {
              const response = await api.answerQuizSession(sessionId, question.id, optionIds);
              setResult({
                isCorrect: response.isCorrect,
                correctOptionIds: response.correctOptionIds,
                explanation: response.explanation,
              });
              setSessionNextQuestion(response.nextQuestion);
            } else {
              setResult(await api.answer(question.id, optionIds));
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save answer.");
          } finally {
            setBusy(false);
          }
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
