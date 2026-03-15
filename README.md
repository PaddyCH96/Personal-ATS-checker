# AI Resume Match Analyzer 🚀

A modern, full-stack AI platform to help job seekers parse resumes, analyze job descriptions, generate tailored content, and track applications.

## ✨ Features

- **Resume Parsing**: AI-powered extraction of skills and experience from PDF resumes.
- **Job Analysis**: ATS match scoring and missing keyword detection.
- **AI Bullet Rewriting**: Optimize resume bullets with specific, measurable impact using OpenAI.
- **Tailored Generation**: Automatically generate perfectly matched resumes and cover letters.
- **Job Intelligence Engine**: Deep insights into recruiter priorities and gap analysis.
- **Application Tracker**: Dashboard to manage your applications, interviews, and offers.
- **Email Delivery**: Send your application package directly from the platform.
- **API Cost Tracking**: Live monitoring of OpenAI API usage costs.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Vanilla CSS + Tailwind
- **PDF Generation**: jsPDF
- **PDF Parsing**: pdfjs-dist
- **Persistence**: LocalStorage (Privacy-first)
- **Emails**: Nodemailer

## 🚀 Getting Started

### 1. Installation

```bash
git clone <repository-url>
cd resume-matcher
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your-api-key
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password
MAIN_API_KEY=your-main-tool-key
```

### 3. Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to see the application.

### 4. Production Deployment

The project is optimized for deployment on Vercel.

```bash
npm run build
npm run start
```

## 📜 Commands

- `npm run dev` - Start development server
- `npm run build` - Create optimized production build
- `npm run start` - Start production server
- `npm run test` - Run unit tests (Vitest)
- `npm run lint` - Run ESLint check

## 🔒 Security & Privacy

- All candidate data is stored in your browser's `localStorage`.
- No personal resume data is persisted on the server.
- API requests are sanitized and validated server-side.
