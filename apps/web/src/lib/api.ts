import type { ApiQuestion } from "@theorie-direkt/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let authToken = localStorage.getItem("theorie-token");

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status, body.code);
  return body as T;
}

export async function authenticate(initData: string) {
  const result = await request<{
    token: string;
    user: { firstName: string | null; category: string; interfaceLanguage: string };
  }>("/api/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData }),
  });
  authToken = result.token;
  localStorage.setItem("theorie-token", result.token);
  return result.user;
}

export const api = {
  languages: () => request<Language[]>("/api/languages"),
  categories: () => request<Category[]>("/api/categories"),
  topics: () => request<Topic[]>("/api/topics"),
  nextQuestion: (category: string, topic?: string) =>
    request<ApiQuestion>(
      `/api/questions/next?category=${encodeURIComponent(category)}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`,
    ),
  question: (id: string) => request<ApiQuestion>(`/api/questions/${id}`),
  answer: (id: string, optionIds: string[]) =>
    request<AnswerResult>(`/api/questions/${id}/answer`, {
      method: "POST",
      body: JSON.stringify({ optionIds }),
    }),
  bookmark: (id: string, bookmarked?: boolean) =>
    request<{ bookmarked: boolean }>(`/api/questions/${id}/bookmark`, {
      method: "POST",
      body: JSON.stringify({ bookmarked }),
    }),
  mistakes: () => request<ApiQuestion[]>("/api/mistakes"),
  bookmarks: () => request<ApiQuestion[]>("/api/bookmarks"),
  statistics: () => request<Statistics>("/api/statistics"),
  preferences: (values: { language?: string; category?: string }) =>
    request<{ language: string; category: string }>("/api/profile/preferences", {
      method: "PATCH",
      body: JSON.stringify(values),
    }),
  startExam: (category: string, questionCount = 30) =>
    request<{ id: string; totalQuestions: number; question: ApiQuestion }>("/api/exam/start", {
      method: "POST",
      body: JSON.stringify({ category, questionCount }),
    }),
  answerExam: (examId: string, questionId: string, optionIds: string[]) =>
    request<{ saved: boolean; currentIndex: number; nextQuestion: ApiQuestion | null }>(
      `/api/exam/${examId}/answer`,
      { method: "POST", body: JSON.stringify({ questionId, optionIds }) },
    ),
  finishExam: (examId: string) =>
    request<{ score: number; totalQuestions: number; percentage: number }>(
      `/api/exam/${examId}/finish`,
      { method: "POST" },
    ),
};

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isContentActive: boolean;
  isInterfaceActive: boolean;
  isRtl: boolean;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctOptionIds: string[];
  explanation: string | null;
}

export interface Statistics {
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  questionsSeen: number;
  bookmarks: number;
  recentExams: Array<{
    id: string;
    score: number;
    totalQuestions: number;
    finishedAt: string;
    category: { code: string };
  }>;
}
