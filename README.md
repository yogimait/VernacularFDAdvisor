# Vernacular FD Advisor

Vernacular FD Advisor is a multilingual, AI-powered web app that helps people in India understand, compare, and plan Fixed Deposits (FDs) with confidence.

It combines conversational guidance, FD discovery tools, bank comparison, and return simulation into one beginner-friendly experience designed for real-world decision making.

## Description

Fixed Deposit choices can be confusing, especially for first-time savers and users who prefer regional languages. This app simplifies that journey with:

- Guided AI conversations in everyday language
- Context-aware recommendations based on amount and tenure
- Visual tools for comparing outcomes before choosing a bank
- Step-based FD opening guidance
- PWA support for app-like and offline-ready usage

## Core Features

- **Multilingual financial assistant:** Supports English, Hindi, Hinglish, Marathi, Gujarati, Tamil, and Bhojpuri across the product experience.
- **AI chat with practical guidance:** Conversational assistant focused on FD basics, rate comparison, safety, taxation context, and next-step guidance.
- **Structured recommendation cards:** Returns actionable FD recommendations with explanation, key points, and clear next actions.
- **Guided FD booking flow:** Step-by-step flow to move from intent to FD setup details (bank, amount, tenure, type) with progress and continuity.
- **FD explorer with smart filters:** Filter and sort FD options by amount, duration, risk profile, and bank type, with quick handoff to AI recommendation.
- **Bank comparison workspace:** Compare selected banks on rate, minimum amount, safety indicators, and maturity simulation.
- **Built-in FD calculator:** Calculate maturity and earned interest using configurable principal, tenure, rate, and compounding frequency.
- **Voice input support:** Record voice, transcribe, and continue the conversation through natural speech input.
- **Offline-ready behavior:** When internet is unavailable, the app can continue with cached recommendations and local guidance.
- **Installable PWA:** Install on supported devices for a faster app-like experience.

## Use Cases

- **First-time FD investor:** Learn FD basics, understand trade-offs, and get simple next steps.
- **Return-focused saver:** Compare available options quickly and identify higher-yield choices for a target tenure.
- **Safety-first planner:** Prioritize stability-oriented options while still tracking expected returns.
- **Regional language user:** Get explanations and guidance in a preferred language rather than only English.
- **Decision simulation before bank visit:** Estimate maturity and compare outcomes before taking action in branch or net banking.

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript
- UI: Tailwind CSS, Radix UI primitives, shadcn/ui patterns
- AI Inference: Groq API (`openai/gpt-oss-120b`)
- Voice Transcription: Groq Whisper (`whisper-large-v3-turbo`)
- PWA: `next-pwa` with runtime caching
- Theming: `next-themes`

## How To Run Locally

### 1. Prerequisites

- Node.js 20+
- npm
- Groq API key

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root with:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Start development server

```bash
npm run dev
```

Open:

`http://localhost:3000`

## How To Use The App

1. Choose your preferred language when prompted.
2. Start from the dashboard or directly open chat.
3. Ask FD questions naturally (for example: best FD for amount/tenure, FD basics, safety, returns).
4. Use Explore to filter options and shortlist candidates.
5. Use Compare to evaluate multiple banks side by side.
6. Use Calculator to test different principal, tenure, and rate scenarios.
7. Use Open FD flow to move through a guided action path.
8. (Optional) Install the app from browser prompt for a native-like experience.

## Available Scripts

- `npm run dev` - Run in development mode
- `npm run build` - Create a production build
- `npm start` - Start production server (after build)
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checks
- `npm run format` - Format TypeScript files with Prettier

## Ingestion Endpoint

For secure ingestion of structured banking documents into the knowledge pipeline, see
[docs/ingestion-api.md](docs/ingestion-api.md).

## Notes

- FD rates and guidance are informational and may change over time.
- Final investment decisions should be verified with official bank sources.
