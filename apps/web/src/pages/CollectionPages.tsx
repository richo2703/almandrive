import { useEffect, useState } from "react";
import type { ApiQuestion } from "@theorie-direkt/shared";
import { api } from "../lib/api";
import { QuestionList } from "../components/QuestionList";
import { useApp } from "../context/AppContext";

function CollectionPage({
  kind,
}: {
  kind: "mistakes" | "bookmarks";
}) {
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const { t } = useApp();
  useEffect(() => { api[kind]().then(setQuestions); }, [kind]);
  const mistakes = kind === "mistakes";
  return (
    <section>
      <p className="eyebrow">{t(mistakes ? "mistakes.eyebrow" : "bookmarks.eyebrow")}</p>
      <h1>{t(mistakes ? "mistakes.title" : "bookmarks.title")}</h1>
      <p className="page-intro">{t(mistakes ? "mistakes.intro" : "bookmarks.intro")}</p>
      <QuestionList questions={questions} empty={t(mistakes ? "mistakes.empty" : "bookmarks.empty")} />
    </section>
  );
}

export const MistakesPage = () => <CollectionPage kind="mistakes" />;
export const BookmarksPage = () => <CollectionPage kind="bookmarks" />;
