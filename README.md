# AI Resume Match Analyzer

A modern, full-stack AI platform to help job seekers parse resumes, analyze job descriptions, generate tailored content, and track applications.

**Runs free and fully offline.** By default it uses a local open-weight model via [Ollama](https://ollama.com) — no API key, no signup, and your resume never leaves your machine. Prefer sharper writing? Drop in an OpenAI, Groq, or Hugging Face key instead. Any OpenAI-compatible endpoint works.

## Features

- **Resume Parsing**: AI-powered extraction of skills and experience from PDF resumes.
- **Job Analysis**: ATS match scoring and missing keyword detection.
- **AI Bullet Rewriting**: Optimize resume bullets with specific, measurable impact using OpenAI.
- **Tailored Generation**: Automatically generate perfectly matched resumes and cover letters.
- **Job Intelligence Engine**: Deep insights into recruiter priorities and gap analysis.
- **Application Tracker**: Dashboard to manage your applications, interviews, and offers.
- **Email Delivery**: Send your application package directly from the platform.
- **API Cost Tracking**: Live monitoring of OpenAI API usage costs.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI**: Any OpenAI-compatible endpoint — Ollama (default), Groq, Hugging Face, or OpenAI
- **Styling**: Vanilla CSS + Tailwind
- **PDF Generation**: jsPDF
- **PDF Parsing**: pdfjs-dist
- **Persistence**: LocalStorage (Privacy-first)
- **Emails**: Nodemailer

## Getting Started

### 1. Installation

```bash
git clone <repository-url>
cd resume-matcher
npm install
```

### 2. Choose your AI backend

The app talks to any **OpenAI-compatible** endpoint, selected with three environment variables. Copy the example file first — **never commit `.env.local`**:

```bash
cp .env.example .env.local
```

#### Option A — Free & local (default, recommended)

Install [Ollama](https://ollama.com), then pull a model:

```bash
ollama pull llama3.1:8b
```

That's it. With no configuration at all the app defaults to `http://localhost:11434/v1`. No key, no signup, no data leaving your machine.

> Needs roughly 5 GB of disk and 8 GB of RAM. On a lower-spec machine, try `ollama pull llama3.2:3b` and set `AI_MODEL=llama3.2:3b`.

#### Option B — Bring your own key

Uncomment the relevant block in `.env.local`:

| Provider | `AI_BASE_URL` | Notes |
|---|---|---|
| **Groq** | `https://api.groq.com/openai/v1` | Free tier, fast, hosted open-weight models |
| **Hugging Face** | `https://router.huggingface.co/v1` | Free credits, then paid |
| **OpenAI** | *(leave unset)* | Paid; best prose quality. Just set `OPENAI_API_KEY` |

```env
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_API_KEY=your-key
```

Any key you supply is billed to *your* account — keep it private and rotate it immediately if it's ever exposed.

#### Which routes actually use a model?

Resume/job **match scoring is pure keyword analysis** — it runs locally with no model at all, on any setup. Only bullet rewriting, tailored resume generation, cover letters, and job intelligence call the AI.

Quality note: open-weight 8B models handle keyword extraction and bullet rewriting well. Cover letter prose is noticeably flatter than GPT-4o-mini — that's the main reason to bring a key.

### 3. Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to see the application.

### 4. Self-Hosting with Docker

```bash
docker compose up --build
```

This builds the app and runs it on port 3001, reading secrets from your local `.env.local` (via `env_file` in `docker-compose.yml` — never baked into the image).

> **Using Ollama with Docker?** `localhost` inside the container refers to the container itself, not your machine. Point the app at the host instead:
>
> ```env
> AI_BASE_URL=http://host.docker.internal:11434/v1
> ```
>
> On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the service in `docker-compose.yml`.

### 5. Production Deployment

The project also deploys cleanly to Vercel — set `OPENAI_API_KEY` (and any optional vars) in the Vercel project's Environment Variables settings, never in code.

```bash
npm run build
npm run start
```

## Commands

- `npm run dev` - Start development server
- `npm run build` - Create optimized production build
- `npm run start` - Start production server
- `npm run test` - Run unit tests (Vitest)
- `npm run lint` - Run ESLint check

## Security & Privacy

- All candidate data is stored in your browser's `localStorage`.
- No personal resume data is persisted on the server.
- API requests are sanitized and validated server-side.
- **With the default local model, resume text never leaves your machine at all.** If you configure a hosted provider (OpenAI, Groq, Hugging Face), resume and job description text is sent to that provider for processing.
- This is a single-user, self-hosted app: whoever holds the `OPENAI_API_KEY` in `.env.local` pays for and controls that instance. Do not deploy a shared public instance without adding authentication and per-user key handling first.
- API routes have basic in-memory per-IP rate limiting (see `lib/rateLimit.ts`) to reduce accidental abuse. It resets on server restart and doesn't share state across multiple instances — good enough for a personal deployment, not a substitute for real auth on a public one.

## Contributing

Issues and PRs are welcome. Please don't include real API keys, sample resumes with personal data, or `.env.local` in any commit or PR diff.

## License

MIT — see [LICENSE](LICENSE).
