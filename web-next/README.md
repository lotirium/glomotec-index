# glomotec INDEX · advisor preview

A production-feel preview of INDEX, the glomotec pipeline that reads UK Home Office caseworker guidance, extracts each predicate as a structured criterion, and scores live client profiles against it. Three Innovator Founder profiles are scored against the v10.0 (27 February 2026) guidance.

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

No environment variables are required to run, build or deploy.

## Deploy to Vercel

The first deploy needs nothing beyond the framework preset. After import:

```bash
vercel
```

### Environment variables (Vercel project settings)

| Var | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | for live scoring | Enables the SCORER at `/clients/new`. When unset, the form loads but is disabled with a one-line note. |
| `FEEDBACK_WEBHOOK_URL` | optional | Forwards feedback submissions to a Slack incoming webhook. When unset, `/api/feedback` still accepts the request and logs server-side. |

Without `ANTHROPIC_API_KEY`, the three seeded fixture clients still render normally — they're pre-scored, no API call needed.

## What's where

- `app/page.tsx` — pipeline overview (first impression).
- `app/clients/[slug]/page.tsx` — full readiness report for a fixture or test profile.
- `app/clients/new/page.tsx` — score a profile via the Claude API (test profiles).
- `app/changes/page.tsx` — change feed across guidance versions.
- `app/sources/page.tsx` — registry of indexed documents.
- `app/api/score/route.ts` — POST endpoint that calls Claude with a tool-use schema and returns an `AssessmentRun`.
- `app/api/feedback/route.ts` — Slack-compatible webhook forwarder.
- `fixtures/` — committed JSON fixtures: routes, criteria, clients, scorings, changefeed.
- `lib/data.ts` — async loaders that read fixtures from disk.
- `lib/score-prompt.ts` — SCORER system prompt + tool schema (`submit_scoring`).
- `lib/scoring.ts` — band/headline calibration that maps probabilities to verdicts.
- `lib/drafts.ts` — `localStorage` helpers for test profiles.
- `components/feedback/feedback-widget.tsx` — pinned feedback button + screenshot capture.

## Scope of this preview

- Static fixtures committed to the repo. No external API calls at runtime.
- Three live clients · sixteen criteria · ten changefeed entries.
- All gov.uk source links point to the real published guidance.
- Profiles are fictional; no PII.
