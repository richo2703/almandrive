import { Flag, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ApiQuestion } from "@theorie-direkt/shared";
import { ApiError, api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { QuestionView } from "../components/QuestionView";

export function ExamPage() {
  const { category, t } = useApp();
  const navigate = useNavigate();
  const [access, setAccess] = useState<boolean | null>(null);
  const [exam, setExam] = useState<{ id: string; total: number; index: number } | null>(null);
  const [question, setQuestion] = useState<ApiQuestion | null>(null);
  const [result, setResult] = useState<{ score: number; totalQuestions: number; percentage: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) navigate("/categories", { replace: true });
    if (access === null && category) {
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
    }
  }, [access, category, navigate]);

  async function start() {
    setLoading(true);
    setPageError(null);
    try {
      const started = await api.startExam(category, 30);
      setExam({ id: started.id, total: started.totalQuestions, index: 0 });
      setQuestion(started.question);
    } catch (error) {
      if (error instanceof ApiError && error.code === "NO_QUESTIONS") {
        setPageError(t("exam.noQuestions") || `No exam questions are available for category ${category}.`);
        return;
      }
      if (error instanceof ApiError && error.code === "payment_required") {
        navigate("/pricing", { replace: true });
        return;
      }
      setPageError(error instanceof Error ? error.message : "Failed to start the exam.");
    } finally {
      setLoading(false);
    }
  }

  if (!category) return <div className="loading">{t("common.loading")}</div>;
  if (access === null) return <div className="loading">{t("common.loading")}</div>;

  if (result) return (
    <section className="exam-result">
      <span className="result-ring">{result.percentage}%</span>
      <p className="eyebrow">{t("exam.complete")}</p>
      <h1>{t("exam.correctCount", { score: result.score, total: result.totalQuestions })}</h1>
      <p>{t("exam.disclaimer")}</p>
      <button className="button button--primary" onClick={() => { setResult(null); setExam(null); setQuestion(null); }}>{t("exam.another")}</button>
    </section>
  );

  if (!exam || !question) return (
    <section>
      <p className="eyebrow">{t("common.category", { category })}</p>
      <h1>{t("exam.title")}</h1>
      <p className="page-intro">{t("exam.intro")}</p>
      {pageError && <div className="empty-state">{pageError} <button className="button button--muted" onClick={() => navigate("/categories")}>{t("home.categories")}</button></div>}
      <div className="exam-summary">
        <div><Timer /><strong>{t("exam.questionCount")}</strong><span>{t("exam.orAvailable")}</span></div>
        <div><Flag /><strong>{t("exam.onePass")}</strong><span>{t("exam.hidden")}</span></div>
      </div>
      <button className="button button--primary button--full" onClick={start} disabled={loading}>
        {loading ? t("common.loading") : t("exam.begin")}
      </button>
    </section>
  );

  return (
    <QuestionView
      key={question.id}
      question={question}
      progressLabel={t("exam.progress", { current: exam.index + 1, total: exam.total })}
      submitLabel={exam.index + 1 === exam.total ? t("exam.finish") : t("exam.continue")}
      onSubmit={async (optionIds) => {
        try {
          const response = await api.answerExam(exam.id, question.id, optionIds);
          if (response.nextQuestion) {
            setQuestion(response.nextQuestion);
            setExam({ ...exam, index: exam.index + 1 });
          } else {
            setResult(await api.finishExam(exam.id));
          }
        } catch (error) {
          if (error instanceof ApiError && error.code === "payment_required") {
            navigate("/pricing", { replace: true });
            return;
          }
          throw error;
        }
      }}
    />
  );
}
