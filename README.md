# Theorie Direkt

Production-oriented MVP monorepo for a Telegram Mini App that teaches German driving theory using original or user-owned question material.

The MVP currently supports question content in English, German, Russian, Turkish, and Uzbek. Its relational translation model and importer remain ready for German, Russian, Turkish, Arabic, Romanian, Polish, Croatian, Portuguese, Spanish, Italian, French, and Greek, with Uzbek added as a learning language.

> Legal note: the included questions are original demo material. Do not import or distribute copyrighted official TÜV/DEKRA questions unless you have the necessary rights.

## Stack

- React, Vite, TypeScript
- Node.js, Express, TypeScript
- PostgreSQL and Prisma
- grammY Telegram bot
- Zod validation
- npm workspaces

## Project layout

```text
apps/
  api/       Express API and Telegram WebApp authentication
  bot/       grammY bot with /start and Mini App button
  web/       Mobile-first React Mini App
packages/
  database/  Prisma schema, seed, and importer
  shared/    Shared validation and API types
import/      CSV and JSON import examples
```

## Local setup

Requirements: Node.js 20+, npm, Docker with Docker Compose.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

Open `http://localhost:5173`. The example environment enables a local demo identity with `DEV_AUTH_ENABLED=true`, so Telegram is not required for local UI development.

The services use:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

## Telegram setup

1. Create a bot with BotFather.
2. Put its token in `TELEGRAM_BOT_TOKEN`.
3. Deploy the web app on an HTTPS URL and set `WEB_APP_URL` to that URL.
4. Set `VITE_API_URL` to the deployed HTTPS API URL when building the frontend.
5. Set `DEV_AUTH_ENABLED=false` outside local development.
6. Configure the Mini App domain with BotFather.
7. Run the API, web app, and bot.

The API validates Telegram `initData` with the documented HMAC procedure and rejects expired data. It then returns a signed, seven-day application session token.

## Database

Create and apply a migration:

```bash
npm run prisma:migrate -- --name init
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Seed all languages, license categories, topics, and 40 original demo questions:

```bash
npm run seed
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

## Import questions

CSV and JSON examples are in [`import/`](./import). Import a file by passing its path after `--`:

```bash
npm run import:questions -- import/questions.example.csv
npm run import:questions -- import/questions.example.json
```

The default command imports `import/questions.example.csv`:

```bash
npm run import:questions
```

`externalId` is the stable upsert key. Re-importing updates the existing question instead of duplicating it.

Required English fields:

```text
externalId, category, topic, questionType, difficulty,
questionTextEn, explanationEn,
answerAEn, answerBEn, answerCEn, answerDEn,
correctAnswers, imageUrl, videoUrl
```

`correctAnswers` accepts keys separated by `|`, commas, semicolons, or spaces, for example `A` or `A|C`.

The importer already discovers additional localized columns using language suffixes:

```text
questionTextDe, explanationDe, answerADe
questionTextRu, explanationRu, answerARu
```

The corresponding language must exist in the `Language` table. The current content languages are English, German, Russian, Turkish, and Uzbek.

Uzbek is also supported as a learning language and translation target:

- interface language support: yes
- question translation target: yes
- official German exam language: no

## Import a ZIP question base

Place the archive here without renaming or deleting it:

```text
import/driving-theory-main.zip
```

Extract it into the project import directory:

```bash
mkdir -p import/my-base
unzip -q import/driving-theory-main.zip -d import/my-base
```

The importer looks for this extracted structure by default:

```text
import/my-base/driving-theory-main/
  driving_theory_questions.json
  driving_theory_questions_de.json
  images/
  videos/
```

CSV files with the same base names are supported as a fallback when JSON is not available. Override the extracted directory when necessary:

```bash
MY_BASE_DIR=import/my-base/another-folder npm run import:my-base
```

The supplied archive currently self-identifies as official copyrighted material, while this project explicitly prohibits importing official copyrighted question banks. The importer therefore has a rights-confirmation guard and will not copy media or write questions by default.

Only when you have verified that you hold the necessary import, publication, translation, image, and video rights, run:

```bash
MY_BASE_RIGHTS_CONFIRMED=true npm run import:my-base
```

The importer:

- prefers JSON and falls back to CSV
- joins English and German records by source question ID
- uses the source question ID as `externalId`
- falls back to `my-base:<source-file>:<row-number>` when no ID exists
- creates translation-ready topics from source chapters
- imports English and German question, answer, and explanation translations
- infers question type from the number of correct answers
- maps source points to difficulty
- copies images to `apps/web/public/media/images`
- copies videos to `apps/web/public/media/videos`
- stores URLs such as `/media/images/example.png`
- logs missing or unsupported fields and continues
- skips numeric free-response questions because the current app supports choice questions only

The source does not contain a reliable license-category field. The importer uses explicit category fields when present, then phrases such as `class B`, then source-ID grouping, and finally category B with a warning. Review inferred category assignments before publishing.

Clear only seeded demo questions:

```bash
npm run questions:clear-demo
```

This deletes questions whose `externalId` begins with `demo-`. It preserves users, languages, categories, topics, and all imported questions.

## Translation workflow

The app does not use paid translation APIs and does not auto-translate anything. Translation work is done offline with CSV files.

Supported translation targets for the workflow are:

- `ru`
- `tr`
- `uz`

Export rows that still need translation:

```bash
npm run translations:export-missing
```

This writes:

- `import/translations/missing-ru.csv`
- `import/translations/missing-tr.csv`
- `import/translations/missing-uz.csv`

Each CSV contains the source question data plus empty target columns. Fill the target columns manually or with an external translation workflow. Do not change `questionExternalId`.

When the files are complete, copy or rename them to:

- `import/translations/completed-ru.csv`
- `import/translations/completed-tr.csv`
- `import/translations/completed-uz.csv`

Then import the translations:

```bash
npm run translations:import
```

Check translation coverage at any time:

```bash
npm run translations:status
```

The import workflow upserts `QuestionTranslation` and `AnswerOptionTranslation` rows by `externalId` and language code. Existing English and German content is preserved.

If you want to translate Russian in smaller chunks, split the missing file into 100-row batches:

```bash
npm run translations:split-ru
```

This writes batch files into:

```text
import/translations/batches/ru/
```

with names like `ru-batch-001.csv`. Translate each batch externally or with your own workflow, then rename the result to `ru-batch-001-translated.csv` and merge them back:

```bash
npm run translations:merge-ru
```

The merge script reconstructs `import/translations/completed-ru.csv` and validates the row count before writing it.

Batch files are numbered in order, so the CSV header and row order stay stable across split and merge.

Run the application after import:

```bash
docker compose up -d
npm run prisma:migrate
npm run dev
```

## Commands

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run dev:bot
npm run build
npm run typecheck
npm run seed
npm run import:questions
npm run import:my-base
npm run questions:clear-demo
npm run translations:export-missing
npm run translations:import
npm run translations:status
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## API

Implemented endpoints:

```text
POST /api/auth/telegram
GET  /api/languages
GET  /api/categories
GET  /api/topics
PATCH /api/profile/preferences
GET  /api/questions/next
GET  /api/questions/:id
POST /api/questions/:id/answer
POST /api/questions/:id/bookmark
GET  /api/mistakes
GET  /api/bookmarks
GET  /api/statistics
POST /api/exam/start
POST /api/exam/:id/answer
POST /api/exam/:id/finish
```

## Production notes

- Use separate, strong PostgreSQL credentials.
- Keep `DEV_AUTH_ENABLED=false`.
- Serve the web app and API over HTTPS.
- Set a strict production `WEB_APP_URL`.
- Run Prisma migrations as a deployment step.
- Put the API and bot behind process supervision.
- Add rate limiting and centralized logs before a public launch.
- Review imported content ownership and licensing before publishing it.
