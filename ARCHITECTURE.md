# Career Assessment — Folder Architecture

```
career-assessment/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Landing / start assessment
│   │   ├── assessment/
│   │   │   └── page.tsx        # Full-screen conversational assessment
│   │   ├── complete/
│   │   │   └── page.tsx        # Thank you + PDF link / email notice
│   │   ├── admin/
│   │   │   ├── layout.tsx      # Protected admin layout
│   │   │   └── page.tsx        # Sessions list, search, export
│   │   └── api/
│   │       ├── submit/route.ts  # POST user responses → score → store
│   │       ├── report/route.ts # GET/POST generate narrative + PDF
│   │       ├── upload/route.ts # Resume / photo upload → storage
│   │       └── admin/          # Admin auth + sessions CRUD
│   │
│   ├── lib/
│   │   ├── schemas/            # Data contracts (no UI)
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   ├── scoring/            # Deterministic engine only
│   │   │   ├── engine.ts       # computeTraitVector + computeFinalOutput
│   │   │   ├── question-bank.ts
│   │   │   └── index.ts
│   │   ├── db/                 # Supabase client + queries
│   │   │   ├── client.ts
│   │   │   ├── users.ts
│   │   │   ├── sessions.ts
│   │   │   └── responses.ts
│   │   ├── storage/            # File upload (Supabase Storage)
│   │   │   └── upload.ts
│   │   ├── ai/                 # Controlled LLM layer only
│   │   │   ├── prompt.ts
│   │   │   └── narrative.ts
│   │   └── pdf/                # HTML → PDF
│   │       ├── template.tsx
│   │       └── generate.ts
│   │
│   ├── components/
│   │   ├── assessment/         # One-question UI, progress, buttons
│   │   ├── ui/                 # Shared (progress bar, buttons)
│   │   └── admin/
│   │
│   └── questions/              # 54 questions data (from Question Bank)
│       └── index.ts
│
├── public/
├── tests/
│   └── scoring/
│       └── engine.test.ts
├── .env.local
├── package.json
├── tsconfig.json
└── next.config.js
```

## Rules

- **Scoring** lives only in `lib/scoring/`. No UI imports scoring; API calls scoring.
- **AI** only receives structured JSON (FinalScoringOutput) and returns narrative text.
- **PDF** is generated from HTML template + narrative, not raw LLM output.
