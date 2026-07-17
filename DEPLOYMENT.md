# Deploy Clymbra AI to Vercel

## 1. Prepare Neon

1. Open the Neon project and select **Connect**.
2. Enable **Connection pooling** and copy the URL containing `-pooler`.
3. Put that URL in local `.env` as `DATABASE_URL`.
4. Run `npm install` and `npm run db:migrate` once.

## 2. Protect and publish the source

The included `.gitignore` excludes `.env`, `.env.local`, build output, and Vercel metadata. Never commit API keys. If a key was previously shared or committed, rotate it before deployment.

Create a GitHub repository and push this project, then choose **Add New → Project** in Vercel and import that repository. Vercel detects Next.js automatically.

## 3. Add Vercel environment variables

Add these under **Project Settings → Environment Variables** for Production and Preview:

- `DATABASE_URL` — required pooled Neon URL
- `GROQ_API_KEY` — required for primary AI generation
- `OPENROUTER_API_KEY` — recommended AI fallback
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` — required for Adzuna jobs
- `ADZUNA_COUNTRY` — use `in`
- `JOOBLE_API_KEY` — recommended second job source
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — required for durable original-file storage
- `AI_MODEL` — optional; defaults to `llama-3.3-70b-versatile`

`HUGGINGFACE_API_KEY` is currently unused and does not need to be deployed.

## 4. Deploy and verify

Deploy from the Vercel dashboard. After it finishes, visit:

- `/api/health` — must return `{"status":"ok",...}`
- `/` — register a test account
- Upload a resume smaller than 4 MB
- Generate a tailored CV and cover letter
- Search jobs and save an application
- Confirm Settings, Projects, Certificates, Portfolio, Analytics, downloads, and dark mode

Use `vercel --prod` for later CLI production deployments if preferred.
