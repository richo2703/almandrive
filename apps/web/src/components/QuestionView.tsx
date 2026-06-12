import { Bookmark, BookmarkCheck, Check, X } from "lucide-react";
import { useState } from "react";
import type { ApiQuestion } from "@theorie-direkt/shared";
import type { AnswerResult } from "../lib/api";
import { useApp } from "../context/AppContext";

interface Props {
  question: ApiQuestion;
  progressLabel?: string;
  result?: AnswerResult | null;
  onSubmit(optionIds: string[]): Promise<void>;
  onBookmark?(): Promise<void>;
  submitLabel?: string;
  busy?: boolean;
}

export function QuestionView({
  question,
  progressLabel,
  result,
  onSubmit,
  onBookmark,
  submitLabel,
  busy,
}: Props) {
  const { t } = useApp();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    if (result) return;
    if (question.type === "SINGLE_CHOICE") {
      setSelected([id]);
    } else {
      setSelected((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    }
  }

  return (
    <article className="question">
      <div className="question__meta">
        <span>{progressLabel ?? t("question.difficulty", { difficulty: question.difficulty })}</span>
        <span>{question.category.code} · {question.topic.name}</span>
      </div>
      <div className="progress-line"><span style={{ width: progressLabel ? "45%" : "65%" }} /></div>
      <div className="question__heading">
        <div>
          <p className="eyebrow">{question.type === "MULTIPLE_CHOICE" ? t("question.selectMultiple") : t("question.selectOne")}</p>
          <h1>{question.text}</h1>
        </div>
        {onBookmark && (
          <button className="icon-button" onClick={onBookmark} aria-label={t("question.bookmark")}>
            {question.bookmarked ? <BookmarkCheck size={21} /> : <Bookmark size={21} />}
          </button>
        )}
      </div>
      {question.imageUrl && <img className="question__media" src={question.imageUrl} alt="" />}
      {question.videoUrl && <video className="question__media" src={question.videoUrl} controls />}
      <div className="answer-list">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.id);
          const isCorrect = result?.correctOptionIds.includes(option.id);
          const isWrong = Boolean(result && isSelected && !isCorrect);
          return (
            <button
              key={option.id}
              className={`answer ${isSelected ? "answer--selected" : ""} ${isCorrect ? "answer--correct" : ""} ${isWrong ? "answer--wrong" : ""}`}
              onClick={() => toggle(option.id)}
              type="button"
            >
              <span className="answer__key">{isCorrect ? <Check size={16} /> : isWrong ? <X size={16} /> : option.key}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
      {result && (
        <section className={`feedback ${result.isCorrect ? "feedback--correct" : "feedback--wrong"}`}>
          <strong>{result.isCorrect ? t("question.correct") : t("question.incorrect")}</strong>
          <p>{result.explanation ?? t("question.fallbackExplanation")}</p>
        </section>
      )}
      {!result && (
        <button
          className="button button--primary button--full"
          disabled={!selected.length || busy}
          onClick={() => onSubmit(selected)}
        >
          {busy ? t("question.saving") : submitLabel ?? t("question.submit")}
        </button>
      )}
    </article>
  );
}
