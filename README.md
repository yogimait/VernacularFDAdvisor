# Vernacular FD Advisor

A multilingual AI-powered financial guidance platform designed to help Indian users understand, compare, and plan Fixed Deposits (FDs) using trusted financial knowledge.

Built for the **Hack to the Future** hackathon.

---

# Problem

Fixed Deposit products are widely used in India, but understanding them remains difficult for many users, especially first-time savers and users more comfortable in regional languages than English.

Current financial information is often:

- fragmented across multiple websites
- filled with complex banking and regulatory jargon
- difficult to compare in one place
- inaccessible for vernacular-first users

Generic AI assistants are also unreliable in finance because they can hallucinate or provide non-verifiable advice.

The challenge was to build a system that provides **trusted, understandable, multilingual financial guidance** instead of generic chatbot responses.

---

# Solution

Vernacular FD Advisor is a **RAG-powered multilingual financial assistant** that helps users:

- understand FD concepts in simple language
- compare FD options across institutions
- estimate maturity returns
- receive source-backed financial guidance
- move through a guided FD decision journey

Instead of relying on generic LLM answers, the platform retrieves relevant financial knowledge from trusted sources such as RBI, SEBI, DICGC, and bank documentation before generating responses.

---

# Core Features

## 1. Multilingual AI Financial Assistant

Supports:

- English
- Hindi
- Hinglish
- Marathi
- Gujarati
- Tamil
- Bhojpuri

Users can ask natural questions such as:

- FD me paisa safe hai kya?
- Best FD for ₹50,000 for 1 year
- Senior citizen FD options
- FD pe tax lagta hai kya?

The assistant provides:

- grounded explanations
- structured recommendations
- source-backed responses
- guided next steps

---

## 2. Guided FD Decision Flow

The assistant goes beyond answering questions and helps users move toward action.

Supports guided flows for:

- choosing a bank
- selecting amount
- choosing tenure
- understanding FD type
- reviewing next steps

---

## 3. FD Explorer

Interactive FD discovery interface with filtering by:

- amount
- tenure
- institution type
- risk preference

Helps users quickly shortlist options.

---

## 4. Bank Comparison Workspace

Compare multiple FD providers side-by-side using:

- rates
- maturity estimates
- safety indicators
- minimum deposit
- recommendation context

---

## 5. FD Calculator

Built-in return estimation with:

- principal amount
- tenure
- interest rate
- compounding frequency

---

## 6. Voice Input Support

Users can speak queries using voice input, which are transcribed into chat for natural interaction.

---

## 7. Automated Knowledge Ingestion Pipeline

Instead of manually updating documents, the project includes an automated ingestion architecture using **n8n**.

Pipeline capabilities:

- trusted source collection
- document fetching
- text cleaning
- SHA256 hashing for change detection
- duplicate prevention
- ingestion into vector knowledge base

---

# Architecture Overview

This project follows a **production-inspired RAG architecture**.

### User Query Flow

```text
User Query
   ↓
Language Understanding
   ↓
Query Embedding
   ↓
Semantic Retrieval
   ↓
Relevant Financial Knowledge
   ↓
LLM Response Generation
   ↓
Structured Multilingual Answer
```

### Knowledge Pipeline

```text
Trusted Financial Sources
(RBI / SEBI / DICGC / Banks)
        ↓
n8n Ingestion Pipeline
        ↓
Content Cleaning
        ↓
Hash-Based Change Detection
        ↓
Semantic Chunking
        ↓
Multilingual Embeddings
        ↓
Supabase pgvector Storage
        ↓
Retrieval Layer
```

---

# Technical Decisions

## Why RAG instead of generic AI?

Financial systems require trust.

RAG was chosen because it:

- reduces hallucination risk
- enables source-backed responses
- allows knowledge updates without retraining
- fits financial advisory use cases better than pure prompting

---

## Why multilingual embeddings?

The target users ask questions in:

- Hindi
- Hinglish
- mixed-language queries

Standard English-only retrieval would fail here.

So multilingual semantic retrieval was required.

---

## Why automated ingestion?

Financial information changes over time.

Manual knowledge updates are not scalable.

Automated ingestion ensures:

- fresher knowledge
- lower maintenance
- duplicate prevention
- production readiness

---

# Tech Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript

## UI / Styling

- Tailwind CSS
- shadcn/ui
- Radix UI

## AI / LLM

- Groq API
- Model: `openai/gpt-oss-120b`

## Speech

- Groq Whisper
- `whisper-large-v3-turbo`

## RAG Stack

- multilingual-e5-large embeddings
- Supabase pgvector
- custom retriever
- semantic chunking pipeline

## Automation

- n8n

## Deployment

- Vercel

---

# How To Run Locally

## Prerequisites

Install:

- Node.js 20+
- npm

---

## Installation

```bash
npm i --legacy-peer-deps
```

---

## Environment Variables

Create:

`.env.local`

Add:

```env
GROQ_API_KEY=your_key_here

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

NEXT_PUBLIC_SUPABASE_URL=your_public_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key

HF_TOKEN=your_huggingface_token

INGEST_TOKEN=your_ingestion_token
INGEST_TRUSTED_SOURCES=comma_separated_trusted_domains
```

---

## Start Development Server

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

# Demo Flow

Recommended demo flow:

1. Ask multilingual question:

```text
FD me paisa safe hai kya?
```

2. Ask recommendation:

```text
Best FD for ₹50,000 for 1 year
```

3. Show guided flow

4. Show comparison workspace

5. Show architecture

---

# Project Structure

```text
/app
/lib
  /rag
    document-loader
    text-cleaner
    semantic-chunker
    metadata-enricher
    retriever
    vector-store
    embedding-client
/api
  /chat
  /transcribe
  /ingest
/scripts
/docs
```

---

# Current Limitations

Current version does not yet include:

- live bank API integrations
- actual FD booking execution
- personalized user financial profiling
- production monitoring stack

FD opening flow is currently a guided simulation.

---

# Future Roadmap

Planned improvements:

- live bank integrations
- real-time FD rate syncing
- stronger personalization
- hybrid inference routing
- expanded financial products
- richer voice-first experience

---

# Submission Notes

This repository contains:

- working prototype
- core multilingual FD advisory flow
- implemented RAG pipeline
- automated ingestion architecture
- demo-ready end-to-end functionality

Designed for live laptop demo.

---

# Disclaimer

This project is for informational guidance purposes.

Financial decisions should always be verified against official banking sources.