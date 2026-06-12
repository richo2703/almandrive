import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ApiQuestion } from "@theorie-direkt/shared";

export function QuestionList({
  questions,
  empty,
}: {
  questions: ApiQuestion[];
  empty: string;
}) {
  if (!questions.length) return <div className="empty-state"><p>{empty}</p></div>;
  return (
    <div className="row-list">
      {questions.map((question) => (
        <Link to={`/question/${question.id}`} className="question-row" key={question.id}>
          <div>
            <span className="tag">{question.category.code} · {question.topic.name}</span>
            <strong>{question.text}</strong>
          </div>
          <ArrowRight size={19} />
        </Link>
      ))}
    </div>
  );
}
