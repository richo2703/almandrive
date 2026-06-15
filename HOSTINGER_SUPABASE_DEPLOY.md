# Alman Drive Hostinger + Supabase Deployment

This project is ready for deployment as a single Node.js application that serves:

- the Express API
- the built React/Vite Mini App
- Telegram Mini App auth
- Telegram Stars payments
- the admin panel

The database remains PostgreSQL via Prisma.

## 1) Create the Supabase database

1. Create a new Supabase project.
2. Choose a European region if your users are mainly in Europe.
3. Keep PostgreSQL enabled.
4. Copy the **pooled** connection string for runtime use and set it as `DATABASE_URL`.
5. Copy the **direct** connection string if Supabase provides one and set it as `DATABASE_DIRECT_URL`.
6. Use `sslmode=require`.

Example formats:

```text
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_DIRECT_URL=postgresql://postgres.xxxxx:PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

Use the pooled URL for the app runtime. Use the direct URL for migrations if the pooler causes Prisma migration issues.

## 2) Prepare Hostinger Node.js Web App

1. Create a Hostinger Node.js Web App.
2. Connect the GitHub repository or upload the project.
3. Select Node.js 20 or 22.
4. Set the build command to:

```bash
npm install && npm run build
```

5. Set the start command to:

```bash
npm run start
```

This project is designed so the production start command launches the API and, if configured, the Telegram bot.

## 3) Required environment variables

Set these in Hostinger:

```text
DATABASE_URL=
DATABASE_DIRECT_URL=
PORT=
WEB_APP_URL=
VITE_API_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_AUTH_MAX_AGE_SECONDS=86400
ADMIN_TELEGRAM_IDS=
DEV_AUTH_ENABLED=false
DEV_ADMIN_TELEGRAM_ID=
```

Notes:

- `DATABASE_URL` should point to the Supabase pooled PostgreSQL connection string.
- `DATABASE_DIRECT_URL` is optional but recommended for migrations if the pooler is problematic.
- `PORT` is usually provided by Hostinger automatically. Do not hardcode `4000` in production.
- `WEB_APP_URL` should be the public HTTPS URL of the deployed Mini App.
- `VITE_API_URL` should point to the public HTTPS API URL if the app and API are separated; if the API and frontend are served from the same Hostinger app, it can be left empty.
- `TELEGRAM_BOT_TOKEN` enables the bot process. If it is not set, the web/API still start.
- `ADMIN_TELEGRAM_IDS` must contain numeric Telegram IDs separated by commas.
- `DEV_AUTH_ENABLED` must stay `false` in production.

## 4) Database initialization commands

Run these from a machine that has access to the project and the Supabase database:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run translations:merge-tr
npm run translations:import
npm run translations:status
```

If Prisma migration deployment against Supabase needs the direct connection, set `DATABASE_DIRECT_URL` first.

If you only need to apply already-created migrations in a production-style flow, use Prisma deploy semantics with the same config:

```bash
npx prisma migrate deploy --config packages/database/prisma.config.ts
```

## 5) Verify after deployment

Open the deployed app and check:

- `/`
- `/pricing`
- `/admin`
- Products
- Promo codes
- News
- Banners
- Promotions

Also verify translation status:

- `trTranslations: 2301`
- `missingTr: 0`

Telegram-specific checks:

- Configure the bot domain in BotFather.
- Open the Mini App from Telegram.
- Confirm Telegram initData auth works.
- Confirm Telegram Stars invoices open with currency `XTR`.

## 6) Troubleshooting

### 404 on `/admin` after refresh

The API must serve the built frontend and SPA fallback. This repository is configured to do that from the production Node.js process.

### `DATABASE_URL` connection problem

Check that the Supabase pooled URL is correct, includes `sslmode=require`, and is reachable from Hostinger.

### Prisma migration problem with the pooler

Set `DATABASE_DIRECT_URL` to the Supabase direct connection string and rerun the migration command.

### Telegram initData missing

Make sure the app is opened inside Telegram and the bot token is configured.

### Admin access denied

Confirm the Telegram user ID is listed in `ADMIN_TELEGRAM_IDS`. Numeric IDs only.

### Bot token missing

The API and web app still start. Only the bot process is skipped.

### Payment invoice not opening

Check that `TELEGRAM_BOT_TOKEN` is configured and that the product exists and is active in the database.

