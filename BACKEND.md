# Backend configuration

## Required configuration

`DATABASE_URL` is the only required secret. Use the pooled Neon connection string and keep all local secrets in `.env`.
For Neon, the hostname should normally contain `-pooler` and the URL should include `sslmode=require`.

Apply the schema after creating or changing a database:

```powershell
npm run db:migrate
```

## API routes

- `GET /api/health` checks the live database connection.
- `POST /api/auth/register` creates an account and HTTP-only session.
- `POST /api/auth/login` authenticates an account.
- `POST /api/auth/logout` deletes the session.
- `GET /api/auth/me` returns the signed-in user.
- `GET|POST /api/resumes` lists or creates resumes.
- `POST /api/resumes/:id/analyze` creates and stores an ATS analysis.
- `GET|POST /api/applications` lists or creates applications.
- `GET /api/dashboard` returns dashboard totals and recent applications.
- `POST /api/ai` generates career advice using Groq with OpenRouter fallback.
- `GET /api/jobs?q=...&location=...` combines normalized Adzuna and Jooble results.

All routes except health, registration, and login require the HTTP-only session cookie.

## Optional service keys

- `GROQ_API_KEY`: primary career AI provider.
- `OPENROUTER_API_KEY`: fallback career AI provider.
- `HUGGINGFACE_API_KEY`: configured for future inference or embeddings; no user-facing route consumes it yet.
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`: Adzuna job search.
- `JOOBLE_API_KEY`: Jooble job search.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`: persistent original resume-file storage.
- `RESEND_API_KEY`: recommended when implementing password reset and verification emails. Email flows are not currently enabled.

Never prefix server secrets with `NEXT_PUBLIC_`; that would expose them to browser JavaScript.

## Vercel notes

- Add every required secret in Vercel Project Settings → Environment Variables for Production and Preview.
- Run `npm run db:migrate` once against the production Neon database before using the deployed application.
- Web resume uploads are limited to 4 MB so multipart requests remain below Vercel Functions' 4.5 MB payload limit.
- The AI and resume-processing routes allow up to 60 seconds of function execution where the Vercel plan permits it.
