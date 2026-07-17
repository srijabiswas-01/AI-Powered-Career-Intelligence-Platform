# Clymbra AI — AI-Powered Career Intelligence Platform

Clymbra AI is a full-stack career workspace for analyzing resumes, finding suitable jobs, generating tailored resumes and cover letters, tracking applications, and maintaining a professional career portfolio.

The application uses Next.js, Neon PostgreSQL, Groq/OpenRouter, Adzuna, Jooble, and Cloudinary. Resume analyses and generated documents are persisted for future use.

## Features

### Resume management

- Upload PDF, DOCX, or TXT resumes up to 4 MB.
- Extract and preview resume text.
- Store original files in Cloudinary and the associated data in Neon.
- Download or view previously uploaded resumes.
- Delete a resume together with its analyses and generated documents.
- Extract factual skills and career keywords from the uploaded resume.

### Resume analysis

- ATS-oriented structural assessment.
- Resume quality score from 0 to 100.
- Strengths and recommended improvements.
- Evaluation of contact information, sections, experience, education, projects, skills, and measurable achievements.
- Resume-derived keywords are used for job matching; the platform does not rely on one hard-coded profession.

The general resume score evaluates resume structure and parsing quality. Job-specific match percentages are calculated separately by comparing a selected resume with an individual job description.

### Job search and matching

- Search by role, keywords, and location.
- Fetch jobs from Adzuna and Jooble.
- Search with or without a selected resume.
- Calculate a job-specific match score when a resume is selected.
- Show matching resume keywords for each job.
- Open the original job listing and save it to the application tracker.

### AI-tailored resumes

- Generate a professional resume for a selected job.
- Use only facts found in the uploaded source resume.
- Preserve real contact details, employers, dates, education, projects, certifications, skills, and achievements.
- Reorder and rewrite supported information for relevance without inventing qualifications.
- Download the result as a professionally formatted ATS-friendly DOCX file.
- Save generated tailored resumes in reusable document history.

### Cover letters and HR emails

- Generate a job-specific cover letter based on an uploaded resume.
- Generate an HR email subject and email body.
- Copy generated text or open it in the default email application.
- Download a professionally formatted DOCX cover letter.
- Reopen previously generated documents from history.

### Career workspace

- Dashboard with live resume, application, interview, and ATS metrics.
- Application pipeline with Applied, Interview, Offer, and Rejected stages.
- Projects and certificates management.
- Profile settings stored in Neon.
- Portfolio view based on saved profile information.
- Analytics based on saved applications, resumes, projects, certificates, and generated documents.
- Responsive sidebar, mobile navigation, favicon, and light/dark themes.

## Technology stack

| Area | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Custom responsive CSS, Lucide icons |
| Database | Neon PostgreSQL |
| Database client | `postgres` |
| Authentication | Database-backed HTTP-only sessions, scrypt password hashing |
| AI | Groq primary provider, OpenRouter fallback |
| Job providers | Adzuna and Jooble |
| File storage | Cloudinary raw assets with Neon binary fallback |
| Resume extraction | `pdf-parse` and `mammoth` |
| DOCX generation | `docx` |
| Hosting | Vercel |

## Project structure

```text
app/
  api/                    Next.js API routes
  globals.css             Main application styles
  theme-toggle.css        Theme and sidebar enhancements
  icon.svg                Application favicon
  layout.tsx              Root layout and metadata
  page.tsx                Dashboard and workspace UI
database/                 Idempotent SQL schema migrations
lib/
  ai.ts                   Groq/OpenRouter integration
  ats.ts                  Resume analysis and job matching
  auth.ts                 Password and session handling
  cloudinary.ts           Original resume storage
  db.ts                   Neon database connection
  professional-docx.ts    DOCX resume and cover-letter renderer
  resume-text.ts          PDF, DOCX, and TXT extraction
scripts/migrate.mjs       Database migration runner
```

## Requirements

- Node.js 20 or newer
- npm
- A Neon PostgreSQL project
- At least one configured AI provider
- Adzuna and/or Jooble credentials for live job results
- Cloudinary credentials for durable original-file storage

## Environment configuration

Copy `.env.example` to `.env` and enter private values:

```powershell
Copy-Item .env.example .env
```

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-POOLER-HOST/DATABASE?sslmode=require

GROQ_API_KEY=
OPENROUTER_API_KEY=
AI_MODEL=llama-3.3-70b-versatile

ADZUNA_APP_ID=
ADZUNA_APP_KEY=
ADZUNA_COUNTRY=in
JOOBLE_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

HUGGINGFACE_API_KEY=
```

### Environment-variable reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Neon PostgreSQL connection string |
| `GROQ_API_KEY` | Recommended | Primary AI generation provider |
| `OPENROUTER_API_KEY` | Recommended | AI fallback provider |
| `AI_MODEL` | No | Groq model; defaults to `llama-3.3-70b-versatile` |
| `ADZUNA_APP_ID` | For Adzuna | Adzuna application ID |
| `ADZUNA_APP_KEY` | For Adzuna | Adzuna application key |
| `ADZUNA_COUNTRY` | No | Adzuna country code; use `in` for India |
| `JOOBLE_API_KEY` | For Jooble | Jooble job-search key |
| `CLOUDINARY_CLOUD_NAME` | Recommended | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Recommended | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Recommended | Cloudinary API secret |
| `HUGGINGFACE_API_KEY` | No | Reserved for future inference or embeddings |

Use the pooled Neon connection URL whose hostname contains `-pooler`. Never prefix server secrets with `NEXT_PUBLIC_`.

The `.gitignore` excludes `.env`, `.env.local`, `.env.*.local`, `.next`, and `.vercel`. Never commit private credentials.

## Local installation

```powershell
git clone https://github.com/srijabiswas-01/AI-Powered-Career-Intelligence-Platform.git
Set-Location AI-Powered-Career-Intelligence-Platform
npm install
Copy-Item .env.example .env
```

Fill in `.env`, then create or update the database schema:

```powershell
npm run db:migrate
```

Start the development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run lint` | Run TypeScript validation |
| `npm run build` | Create an optimized production build |
| `npm start` | Run the compiled production application |
| `npm run db:migrate` | Apply all idempotent SQL migrations using `.env` |

## Database schema

The migration files create and maintain:

- `users`
- `sessions`
- `resumes`
- `resume_analyses`
- `tailored_resumes`
- `cover_letters`
- `applications`
- `profiles`
- `projects`
- `certificates`

Foreign keys use cascading deletion where appropriate. Deleting a resume removes its related analyses, tailored resumes, and cover letters.

Migrations use `CREATE ... IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`, so they can be run again safely.

## Main API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Check the Neon database connection |
| `/api/auth/register` | POST | Create an account and session |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | End the session |
| `/api/auth/me` | GET | Return the signed-in user |
| `/api/resumes` | GET, POST | List or upload resumes |
| `/api/resumes/:id` | DELETE | Delete a resume and associated data |
| `/api/resumes/:id/view` | GET | View an original resume |
| `/api/resumes/:id/download` | GET | Download an original resume |
| `/api/resumes/:id/analyze` | POST | Save a resume analysis |
| `/api/resumes/:id/tailor` | POST | Create and save a tailored resume |
| `/api/resumes/:id/cover-letter` | POST | Create a cover letter and HR email |
| `/api/generated-documents` | GET | List generated-document history |
| `/api/jobs` | GET | Search and normalize external job results |
| `/api/applications` | GET, POST | List or create applications |
| `/api/applications/:id` | PATCH, DELETE | Update stage or delete an application |
| `/api/projects` | GET, POST | Manage projects |
| `/api/certificates` | GET, POST | Manage certificates |
| `/api/profile` | GET, PUT | Load or save profile settings |
| `/api/portfolio` | GET | Build the portfolio view |
| `/api/analytics` | GET | Return saved workspace metrics |

Except for health, registration, and login, routes require the signed-in HTTP-only session cookie.

## Resume upload behavior

The production upload limit is 4 MB because Vercel Functions accept request payloads up to 4.5 MB. The application validates the size in both the browser and API.

Supported formats:

- PDF (`.pdf`)
- Microsoft Word (`.docx`)
- Plain text (`.txt`)

Password-protected, corrupted, or image-only PDFs may not contain extractable text. Convert scanned documents with OCR before uploading.

## Deploy to Vercel

1. Open [Vercel](https://vercel.com/new).
2. Import this GitHub repository.
3. Keep **Next.js** as the framework preset.
4. Keep `npm run build` as the build command.
5. Add all required values from `.env` in **Project Settings → Environment Variables**.
6. Apply variables to Production and Preview.
7. Deploy the project.

Do not upload `.env` to Vercel as a repository file. Enter each value through the Vercel dashboard.

After deployment, verify:

```text
https://YOUR-PROJECT.vercel.app/api/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "neondb",
  "timestamp": "..."
}
```

Then test account registration, resume upload, job search, tailored resume generation, cover-letter generation, document downloads, application tracking, Settings, Portfolio, Analytics, and dark mode.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the focused deployment checklist and [BACKEND.md](BACKEND.md) for backend notes.

## Security

- Passwords are salted and hashed with Node.js `scrypt`.
- Authentication uses random, hashed, database-backed session tokens.
- Session cookies are HTTP-only, `SameSite=Lax`, and secure in production.
- Database queries use parameterized SQL templates.
- Resume and generated-document routes verify record ownership.
- Secrets remain server-side and are excluded from Git.

If a database URL or API key is pasted into chat, committed, included in screenshots, or otherwise exposed, rotate it immediately in the provider dashboard and update Vercel.

## Troubleshooting

### Database connection failed

- Confirm `DATABASE_URL` is present.
- Use the Neon pooled hostname containing `-pooler`.
- Keep `sslmode=require` in the connection URL.
- Run `npm run db:migrate`.
- Check `/api/health`.

### AI generation unavailable

- Confirm `GROQ_API_KEY` or `OPENROUTER_API_KEY` is configured.
- Confirm the selected model is available to that provider.
- Redeploy after changing Vercel environment variables.

### No jobs returned

- Confirm at least one job provider is configured.
- Verify `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY`, and/or `JOOBLE_API_KEY`.
- Try a broader role and location.

### Resume cannot be viewed or downloaded

- Confirm all three Cloudinary values are configured.
- Upload a new resume after configuring Cloudinary.
- Old database records cannot recover an original file that was never stored successfully.

### PDF text is missing

- Ensure the PDF contains selectable text.
- Remove password protection.
- Run OCR on scanned PDFs before uploading.

## Repository

[github.com/srijabiswas-01/AI-Powered-Career-Intelligence-Platform](https://github.com/srijabiswas-01/AI-Powered-Career-Intelligence-Platform)

