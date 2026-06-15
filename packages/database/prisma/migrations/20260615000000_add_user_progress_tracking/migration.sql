-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "QuizMode" AS ENUM ('PRACTICE', 'EXAM', 'MISTAKES', 'SAVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "UserAnswer"
  ADD COLUMN IF NOT EXISTS "selectedAnswerKey" TEXT,
  ADD COLUMN IF NOT EXISTS "languageCode" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseCategoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "topicId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ExamSession"
  ADD COLUMN IF NOT EXISTS "topicId" TEXT,
  ADD COLUMN IF NOT EXISTS "languageCode" TEXT,
  ADD COLUMN IF NOT EXISTS "mode" "QuizMode" NOT NULL DEFAULT 'PRACTICE',
  ADD COLUMN IF NOT EXISTS "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "wrongAnswers" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserTopicProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "totalQuestions" INTEGER NOT NULL DEFAULT 0,
  "answeredQuestions" INTEGER NOT NULL DEFAULT 0,
  "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserTopicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserMistake" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "mistakeCount" INTEGER NOT NULL DEFAULT 1,
  "lastMistakeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserMistake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserTopicProgress_userId_topicId_key" ON "UserTopicProgress"("userId", "topicId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserTopicProgress_userId_completedAt_idx" ON "UserTopicProgress"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserMistake_userId_questionId_key" ON "UserMistake"("userId", "questionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserMistake_userId_resolvedAt_lastMistakeAt_idx" ON "UserMistake"("userId", "resolvedAt", "lastMistakeAt");

-- AddForeignKey
ALTER TABLE "UserAnswer"
  ADD CONSTRAINT "UserAnswer_licenseCategoryId_fkey"
  FOREIGN KEY ("licenseCategoryId") REFERENCES "LicenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer"
  ADD CONSTRAINT "UserAnswer_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession"
  ADD CONSTRAINT "ExamSession_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicProgress"
  ADD CONSTRAINT "UserTopicProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicProgress"
  ADD CONSTRAINT "UserTopicProgress_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMistake"
  ADD CONSTRAINT "UserMistake_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMistake"
  ADD CONSTRAINT "UserMistake_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

