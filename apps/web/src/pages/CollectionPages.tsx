import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ApiQuestion } from "@theorie-direkt/shared";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

function QuestionRow({
  question,
  actionLabel,
  onAction,
}: {
  question: ApiQuestion;
  actionLabel: string;
  onAction(): Promise<void>;
}) {
  return (
    <div className="question-row">
      <Link to={`/question/${question.id}`} className="question-row__main">
        <div>
          <span className="tag">{question.category.code} · {question.topic.name}</span>
          <strong>{question.text}</strong>
        </div>
        <ArrowRight size={19} />
      </Link>
      <button className="button button--muted question-row__action" onClick={() => void onAction()}>
        {actionLabel}
      </button>
    </div>
  );
}

function CollectionPage({ kind }: { kind: "mistakes" | "bookmarks" }) {
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const { t } = useApp();
  const navigate = useNavigate();
  const mistakes = kind === "mistakes";

  useEffect(() => {
    setBusy(true);
    (mistakes ? api.meMistakes() : api.meSaved())
      .then(setQuestions)
      .finally(() => setBusy(false));
  }, [mistakes]);

  async function practice() {
    if (!questions.length) return;
    const session = await api.startQuizSession({
      category: questions[0]!.category.code,
      mode: mistakes ? "MISTAKES" : "SAVED",
      questionIds: questions.map((question) => question.id),
      questionCount: questions.length,
    });
    navigate(`/question/${session.question.id}`, { state: { sessionId: session.id } });
  }

  async function handleAction(question: ApiQuestion) {
    if (mistakes) {
      await api.resolveMistake(question.id);
    } else {
      await api.unsaveQuestion(question.id);
    }
    setQuestions(await (mistakes ? api.meMistakes() : api.meSaved()));
  }

  return (
    <section>
      <p className="eyebrow">{t(mistakes ? "mistakes.eyebrow" : "bookmarks.eyebrow")}</p>
      <h1>{t(mistakes ? "mistakes.title" : "bookmarks.title")}</h1>
      <p className="page-intro">{t(mistakes ? "mistakes.intro" : "bookmarks.intro")}</p>

      <section className="card-grid">
        <article className="card">
          <span className="tag">{mistakes ? t("mistakes.countLabel") : t("bookmarks.countLabel")}</span>
          <strong>{questions.length}</strong>
        </article>
        <button className="button button--primary" onClick={() => void practice()} disabled={!questions.length || busy}>
          <RotateCcw size={18} />
          {mistakes ? t("mistakes.practice") : t("bookmarks.practice")}
        </button>
      </section>

      {busy ? (
        <div className="loading">{t("common.loading")}</div>
      ) : questions.length ? (
        <div className="row-list">
          {questions.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              actionLabel={mistakes ? t("mistakes.resolve") : t("bookmarks.unsave")}
              onAction={async () => handleAction(question)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>{t(mistakes ? "mistakes.empty" : "bookmarks.empty")}</p>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <Link className="button button--muted" to="/learn">{t("home.startLearning")}</Link>
      </div>
    </section>
  );
}

export const MistakesPage = () => <CollectionPage kind="mistakes" />;
export const BookmarksPage = () => <CollectionPage kind="bookmarks" />;
