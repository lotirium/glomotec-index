# INDEX

INDEX is glomotec's regulatory intelligence layer. It fetches UK caseworker guidance, structures it into machine-evaluable criteria, detects changes between versions, and scores candidate profiles against the live ruleset with calibrated confidence. The framework is described in full in [`B02_NilyufarShodmonova_UK-Caseworker-Guidance-Framework_v1.pdf`](./B02_NilyufarShodmonova_UK-Caseworker-Guidance-Framework_v1.pdf) (also at the repo root).

**Live demo:** https://index-advisor.vercel.app
**Framework PDF:** [B02_NilyufarShodmonova_UK-Caseworker-Guidance-Framework_v1.pdf](./B02_NilyufarShodmonova_UK-Caseworker-Guidance-Framework_v1.pdf)

This repo contains two complementary surfaces over the same system:

1. **Python pipeline** (this directory), the actual regulatory intelligence pipeline. Five modules run via a single command, output structured artefacts.
2. **Vercel advisor UI** ([`web-next/`](./web-next/)), the advisor-facing presentation layer over the pipeline's output. Live at [https://index-advisor.vercel.app](https://index-advisor.vercel.app).

## The Python pipeline

Five modules. Each is a directory at the repo root.

| Module        | Directory       | What it does                                                                        |
|---------------|-----------------|-------------------------------------------------------------------------------------|
| **CRAWLER**   | `crawler/`      | Fetches gov.uk caseworker guidance HTML and the linked PDF attachment, captures version metadata, content-addresses both. |
| **EXTRACTOR** | `extractor/`    | Turns prose paragraphs into criteria conforming to `schema/assessable_criterion.json` via Claude Opus 4.7 with tool use. |
| **CHANGEFEED**| `changefeed/`   | Diffs successive versions at byte, structural, and criterion-id levels. Classifies changes as numeric / pathway / process / cosmetic and routes alerts. |
| **SCORER**    | `scorer/`       | Scores a candidate profile against the live ruleset using the canonical prompt + tool schema in `shared/`. Returns probability, confidence band, supporting evidence, missing inputs. |
| **EVALUATOR** | `evaluator/`    | Runs EXTRACTOR against a hand-labelled golden set, reports pass rate. Acts as a deployment gate: re-runs on any prompt or schema change, regressions block deploy. |

Storage at `storage/db.py` is SQLite for the POC; the schema is the same one the production Supabase Postgres path uses (see framework PDF §08).

### Setup

```bash
cd glomotec_index
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...      # required for EXTRACTOR / SCORER / EVALUATOR
```

### Run

```bash
python run.py
```

Default flow: crawl Innovator Founder (HTML + PDF) → extract criteria → run CHANGEFEED → score the sample candidate (`examples/candidate_alex.json`) → run EVALUATOR. Database lands in `output/index.sqlite`, per-stage JSON in `output/`.

Selective runs:

```bash
python run.py --crawl-only                      # CRAWLER only (no API key needed)
python run.py --extract                          # CRAWLER + EXTRACTOR
python run.py --changefeed                      # diff latest against prior stored snapshot
python run.py --score examples/candidate_priya.json
python run.py --evaluate                         # golden-set regression
```

Three sample candidates ship: Alex Mendez, Priya Iyer, Tomás Almeida, all in `examples/`. Each has a corresponding `output/scoring_<id>_innovator_founder.json` from a real SCORER run.

## The Vercel advisor UI

`web-next/` is the presentation layer the advisor sees. It's a Next.js app deployed to Vercel.

It reads from three kinds of source:

- **Static fixtures** at `web-next/fixtures/`, derived directly from `output/`. The criteria, the three seeded clients' assessments, and the live module-status header all come from real Python pipeline runs. The fixture build is reproducible: `output/criteria_innovator_founder.json` is copied verbatim, and `output/scoring_<id>_innovator_founder.json` is wrapped in the UI envelope (verdict, summary, category split) for `web-next/fixtures/scorings/`.
- **Live scoring** via `/clients/new` → `/api/score`. The advisor pastes a free-text profile; the API loads the same `shared/scorer_system_prompt.md` + `shared/scorer_tool_schema.json` the Python SCORER uses, and streams batched results back as NDJSON.
- **Live pipeline demo** on the home page (`/`), a "Run live pipeline" button drives three Vercel API routes against live gov.uk data: `/api/pipeline/crawl` (HTTP fetch, hash, version), `/api/pipeline/changefeed` (compares fresh hash to `web-next/fixtures/snapshot_v10.0.json`), `/api/pipeline/extract` (Claude Opus tool-use call against one paragraph from the freshly fetched page, using the same `shared/extractor_*` contracts the Python EXTRACTOR uses). The full Python pipeline at the repo root remains the production-shape implementation; the Vercel demo is a transparency shim so the cohort can watch CRAWLER → CHANGEFEED → EXTRACTOR → SCORER light up in ~15-20s. The button is gated on `ANTHROPIC_API_KEY`.

### SIGNAL prospect preview

`/signal` is a second surface inside the same Next.js app. It mirrors what glomotec's existing prospect chatbot at signal.glomotec.com does, with INDEX's substantive layer wired in for actual pre-qualification:

- `/signal` — landing screen with a single text input ("Hi, I'm SIGNAL. Tell me about yourself…") and a list of past local conversations.
- `/signal/[id]` — chat thread + qualification card. Conversations persist to `localStorage` under `signal.sessions.<uuid>`; refresh restores the active session.
- `POST /api/signal/chat` — Claude Sonnet 4.6 conversation with a SIGNAL-style system prompt that gathers nationality, age, current visa status, education, business stage, funding, endorsement, English proficiency, and prior immigration history. After 5–8 turns the model emits a structured profile via the `record_prospect_profile` tool — that tool call is the handoff signal.
- `POST /api/signal/qualify` — substantive-only scoring against the Innovator Founder route. Filters `shared/scorer_*` to `category === "substantive"`, scores in parallel batches via Haiku 4.5, applies the same cap rule from `web-next/lib/scoring.ts`, then runs a second synthesis call to write a 2–3 sentence prospect-friendly verdict and 1–3 plain-English gaps. Returns `substantive_pct` only; `procedural_pct` is intentionally `null`.

Verdict bands are presentation-tuned for the prospect surface: `Strong fit` (≥85), `Likely fit` (60–84), `Worth exploring` (40–59), `Not a fit yet` (<40).

v0 SIGNAL limitations:
- Innovator Founder route only.
- Substantive criteria only — procedural readiness (fees, biometrics, documents in English/Welsh, translations) is not measured.
- Conversations are local-only; no sync across browsers or private windows.
- The assistant turn is delivered as one chunk after Sonnet completes; token streaming is a later iteration.
- The cap rule means any single below-threshold substantive criterion holds the aggregate at 50, even when other substantive criteria are vacuously satisfied. This is a deliberate match with the advisor-side logic.

### Shared schemas + prompts

`shared/` at the repo root holds the single source of truth for the model-facing modules:

- `shared/scorer_system_prompt.md`, the SCORER system prompt, including the substantive vs procedural reasoning split documented in framework §03.
- `shared/scorer_tool_schema.json`, the canonical `record_scoring` tool schema both SCORER consumers register with the model.
- `shared/extractor_system_prompt.md`, the EXTRACTOR system prompt, including worked examples for both mandatory binary criteria and discretionary two-part criteria.
- `shared/extractor_tool_schema.json`, the canonical `record_criterion` tool schema, sourced from `schema/assessable_criterion.json`.

Python loads all four directly. Next.js mirrors them into `web-next/shared/` via a `prebuild` script (`web-next/scripts/sync-shared.mjs`), so Vercel sees them at deploy time. If either consumer's tool call shape drifts from the shared files, the relevant module drifts; both consumers fail loudly if the shared files are missing.

### Quick start

```bash
cd web-next
npm install
npm run dev                # http://localhost:3000
```

Required env in `web-next/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without the key, the static seeded clients still render; the `/clients/new` live-scoring flow will return a 503.

### Deploy

```bash
cd web-next
npm run sync-shared        # ensure web-next/shared/ matches /shared/
vercel --prod
```

## Artefact flow

```
gov.uk caseworker guidance
        │
        ▼
   CRAWLER ──────────► output/sections_<route>.json (HTML + PDF)
                       output/index.sqlite (documents table, hashed)
        │
        ▼
   EXTRACTOR ───────► output/criteria_<route>.json
                       output/index.sqlite (criteria table)
        │
        ▼
   CHANGEFEED ──────► output/alerts.jsonl
        │
        ▼
   SCORER ──────────► output/scoring_<candidate>_<route>.json
                       (loads shared/scorer_system_prompt.md
                              shared/scorer_tool_schema.json)
        │
        ▼
   web-next/fixtures/  ◄── derived from output/, deployed to Vercel
   web-next/api/score/ ◄── live scoring path, same shared/ files
```

## What ships in v0

- One route end to end: Innovator Founder. CRAWLER fetches HTML + PDF (39-page caseworker bundle), persists both with separate hashes.
- Per-profile aggregate readiness (substantive_pct and procedural_pct) is the arithmetic mean of `probability_meets` capped at 50 when any criterion in the category falls below threshold (probability < 0.35); see framework §06. The cap stops vacuously-satisfied universal eligibility criteria from masking dealbreakers in the aggregate. Both `web-next/lib/scoring.ts:computeAggregates` and `scorer/aggregator.py:build_assessment_run` apply the same rule.
- 16 criteria extracted, hand-classified into substantive (7) / procedural (9). Re-extraction with `category` in the EXTRACTOR tool schema is the next step (TODO in `extractor/extractor.py`).
- Three real candidate scorings via Sonnet-4-6, structurally identical to the live `/api/score` Haiku-4-5 output.
- CHANGEFEED logic implemented and exercised. Real CHANGEFEED diff output is empty in this snapshot (we have one substantive version of v10.0 in storage; byte-level drift across re-fetches fires the cheap check, criterion-level diff confirms no real change). The advisor UI's `/changes` page therefore reads from a small fabricated changefeed fixture for demonstration. Run a second crawl after any guidance update and the diff path produces real alerts.
- EVALUATOR golden set with 10 reference criteria; pass-rate gate.

## What ships in v1

See framework PDF §08 (Production and integration with COMPASS) and §10 (International expansion). Highlights: Supabase Postgres, Slack alerts to COMPASS, per-modality calibration curves, adaptive polling, multi-route ingestion.

## File layout

```
glomotec_index/
├── README.md                                              (this file)
├── B02_NilyufarShodmonova_UK-Caseworker-Guidance-Framework_v1.pdf
├── requirements.txt
├── routes.yaml
├── run.py
├── schema/
│   └── assessable_criterion.json
├── shared/                                                (canonical scorer + extractor files)
│   ├── scorer_system_prompt.md
│   ├── scorer_tool_schema.json
│   ├── extractor_system_prompt.md
│   └── extractor_tool_schema.json
├── crawler/             extractor/        changefeed/
├── scorer/              evaluator/        storage/
├── examples/                                              (sample candidates)
│   ├── candidate_alex.json
│   ├── candidate_priya.json
│   └── candidate_tomas.json
├── output/                                                (generated by run.py)
│   ├── index.sqlite
│   ├── sections_innovator_founder.json (+_pdf.json)
│   ├── criteria_innovator_founder.json
│   ├── scoring_<candidate>_innovator_founder.json
│   ├── alerts.jsonl
│   └── evaluation_run.json
└── web-next/                                              (Vercel advisor UI)
    ├── app/                                               (routes incl. /clients, /clients/new, /api/score)
    ├── components/
    ├── fixtures/                                          (derived from output/)
    ├── lib/
    ├── scripts/sync-shared.mjs                            (prebuild mirror)
    └── shared/                                            (mirror of /shared/, deployed)
```
