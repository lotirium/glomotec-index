"""
INDEX dashboard — FastAPI app that exposes the live INDEX pipeline through a
web UI in the same visual register as glomotec's signal product.

Endpoints
---------
GET  /                          serve the dashboard
GET  /api/routes                routes with crawl/extract status from SQLite
GET  /api/route/{id}/criteria   list of extracted criteria for a route
GET  /api/candidate/example     load examples/candidate_alex.json
POST /api/score                 score a candidate against a route's criteria
                                (calls Claude Opus 4.7 via the live SCORER)

Run
---
    cd glomotec_index
    export ANTHROPIC_API_KEY=sk-ant-...
    .venv/bin/python -m uvicorn web.server:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from scorer import Scorer  # noqa: E402
from storage import Database  # noqa: E402

WEB_DIR = ROOT / "web"
STATIC_DIR = WEB_DIR / "static"
DB_PATH = ROOT / "output" / "index.sqlite"
ROUTES_PATH = ROOT / "routes.yaml"
EXAMPLE_CANDIDATE_PATH = ROOT / "examples" / "candidate_alex.json"
CACHE_PATH = ROOT / "output" / "scoring_cache.json"
SCORER_CONCURRENCY = 12


app = FastAPI(title="INDEX dashboard", version="0.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _db() -> Database:
    return Database(DB_PATH)


def _load_routes_config() -> list[dict[str, Any]]:
    return yaml.safe_load(ROUTES_PATH.read_text())["routes"]


def _canonicalize(obj: Any) -> Any:
    """Normalize int/float so 7 and 7.0 hash the same. The form yields ints when
    a fractional input has no decimals; the example file may have floats."""
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, int):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _canonicalize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_canonicalize(x) for x in obj]
    return obj


SECTION_KEYWORDS = {
    "endorsement": ["endorsing body", "endorsement letter", "endorsed", "endorsement"],
    "business": ["innovative", "viable", "scalable", "key role in", "active in the day", "active in day", "applicant's business", "the business", "business venture", "investment in the", "intellectual property"],
    "english_language": ["english language", "cefr", "ielts", "majority-english", "majority english", "english speaker", "level b", "b1 ", "b2 ", "c1 ", "c2 "],
    "finance": ["maintenance funds", "personal funds", "immigration health surcharge", "held for "],
    "documents_in_english_or_welsh": ["documents in english", "documents in welsh", "translation", "translated"],
    "absences_from_uk_days_last_12_months": ["absence from", "absent from", "continuous residence"],
    "suitability_concerns": ["suitability", "criminal record", "general grounds for refusal", "good character"],
    "previous_visa_history": ["previous visa", "switching", "student visa", "course completion", "completed the course"],
}

ALWAYS_RELEVANT = {"intended_route"}


def _relevant_sections(criterion: dict[str, Any]) -> set[str]:
    text = json.dumps(criterion).lower()
    out: set[str] = set(ALWAYS_RELEVANT)
    for section, keywords in SECTION_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            out.add(section)
    return out


def _candidate_subset(candidate: dict[str, Any], sections: set[str]) -> dict[str, Any]:
    return {k: v for k, v in candidate.items() if k in sections}


def _cache_key(candidate: dict[str, Any], criterion: dict[str, Any]) -> str:
    sections = _relevant_sections(criterion)
    sub = _candidate_subset(candidate, sections)
    canon = _canonicalize(sub)
    blob = json.dumps(canon, sort_keys=True) + "::" + criterion["id"]
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _load_cache() -> dict[str, dict[str, Any]]:
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def _save_cache(cache: dict[str, dict[str, Any]]) -> None:
    CACHE_PATH.write_text(json.dumps(cache, indent=2))


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/routes")
def list_routes() -> list[dict[str, Any]]:
    db = _db()
    try:
        out: list[dict[str, Any]] = []
        for r in _load_routes_config():
            doc = db.latest_document(r["id"]) if r.get("enabled", True) else None
            criteria_count = (
                len(db.criteria_for_document(doc["document_id"])) if doc else 0
            )
            out.append({
                "id": r["id"],
                "name": r["name"],
                "enabled": bool(r.get("enabled", True)),
                "document_version": doc["version_string"] if doc else None,
                "fetched_at": doc["fetched_at"] if doc else None,
                "criteria_count": criteria_count,
            })
        return out
    finally:
        db.close()


@app.get("/api/route/{route_id}/criteria")
def list_criteria(route_id: str) -> list[dict[str, Any]]:
    db = _db()
    try:
        doc = db.latest_document(route_id)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"no documents stored for route {route_id}")
        return db.criteria_for_document(doc["document_id"])
    finally:
        db.close()


@app.get("/api/candidate/example")
def example_candidate() -> dict[str, Any]:
    return json.loads(EXAMPLE_CANDIDATE_PATH.read_text())


class ScoreRequest(BaseModel):
    route_id: str
    candidate: dict[str, Any]


@app.post("/api/score")
async def score(req: ScoreRequest) -> dict[str, Any]:
    db = _db()
    try:
        doc = db.latest_document(req.route_id)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"no documents for route {req.route_id}")
        criteria = db.criteria_for_document(doc["document_id"])
        if not criteria:
            raise HTTPException(status_code=404, detail=f"no extracted criteria for route {req.route_id}")
        document_version = doc["version_string"]
    finally:
        db.close()

    by_id = {c["id"]: c for c in criteria}
    cache = _load_cache()
    cache_dirty = False

    cached: dict[str, dict[str, Any]] = {}
    cold: list[tuple[dict[str, Any], str]] = []
    for c in criteria:
        key = _cache_key(req.candidate, c)
        if key in cache:
            cached[c["id"]] = {**cache[key], "_cache": "hit"}
        else:
            cold.append((c, key))

    if cold:
        scorer = Scorer()
        sem = asyncio.Semaphore(SCORER_CONCURRENCY)

        async def score_one(c: dict[str, Any], key: str) -> dict[str, Any]:
            async with sem:
                try:
                    r = await asyncio.to_thread(scorer.score, req.candidate, c)
                    cache[key] = r
                    return r
                except Exception as e:
                    return {
                        "criterion_id": c["id"],
                        "error": str(e),
                        "scored_at": datetime.now(timezone.utc).isoformat(),
                    }

        fresh = await asyncio.gather(*(score_one(c, k) for c, k in cold))
        for r in fresh:
            cached[r["criterion_id"]] = {**r, "_cache": "miss"}
        cache_dirty = True

    if cache_dirty:
        _save_cache(cache)

    results = [cached[c["id"]] for c in criteria]

    enriched: list[dict[str, Any]] = []
    for r in results:
        crit = by_id.get(r["criterion_id"], {})
        enriched.append({
            **r,
            "criterion": {
                "id": crit.get("id"),
                "modality": crit.get("modality"),
                "assessment_mechanism": crit.get("assessment_mechanism"),
                "decision_stage": crit.get("decision_stage"),
                "section_heading": crit.get("source", {}).get("anchor", {}).get("section_heading"),
                "verbatim_text": crit.get("source", {}).get("anchor", {}).get("verbatim_text"),
                "thresholds": crit.get("thresholds", []),
                "default_behaviour": crit.get("default_behaviour"),
                "trigger_for_departure": crit.get("trigger_for_departure"),
            },
        })

    summary = _summarise(enriched)
    return {
        "route_id": req.route_id,
        "document_version": document_version,
        "results": enriched,
        "summary": summary,
    }


def _summarise(results: list[dict[str, Any]]) -> dict[str, int]:
    bands = {"high": 0, "medium": 0, "low": 0, "below_threshold": 0, "error": 0}
    for r in results:
        if "error" in r:
            bands["error"] += 1
        else:
            bands[r.get("confidence_level", "below_threshold")] += 1
    return bands


def _enrich(r: dict[str, Any], by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    crit = by_id.get(r["criterion_id"], {})
    return {
        **r,
        "criterion": {
            "id": crit.get("id"),
            "modality": crit.get("modality"),
            "assessment_mechanism": crit.get("assessment_mechanism"),
            "decision_stage": crit.get("decision_stage"),
            "section_heading": crit.get("source", {}).get("anchor", {}).get("section_heading"),
            "verbatim_text": crit.get("source", {}).get("anchor", {}).get("verbatim_text"),
            "predicate_statement": crit.get("predicate", {}).get("statement"),
            "thresholds": crit.get("thresholds", []),
            "default_behaviour": crit.get("default_behaviour"),
            "trigger_for_departure": crit.get("trigger_for_departure"),
        },
    }


@app.post("/api/score/stream")
async def score_stream(req: ScoreRequest) -> StreamingResponse:
    """Streams one NDJSON line per criterion as SCORER finishes scoring it.

    Cached entries are emitted immediately; cold entries flow in as they complete.
    First line is `{"event":"start", ...}`; final line is `{"event":"end", "summary":...}`.
    """
    db = _db()
    try:
        doc = db.latest_document(req.route_id)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"no documents for route {req.route_id}")
        criteria = db.criteria_for_document(doc["document_id"])
        if not criteria:
            raise HTTPException(status_code=404, detail=f"no extracted criteria for route {req.route_id}")
        document_version = doc["version_string"]
    finally:
        db.close()

    by_id = {c["id"]: c for c in criteria}
    cache = _load_cache()

    cached_now: list[dict[str, Any]] = []
    cold: list[tuple[dict[str, Any], str]] = []
    for c in criteria:
        key = _cache_key(req.candidate, c)
        if key in cache:
            cached_now.append({**cache[key], "_cache": "hit"})
        else:
            cold.append((c, key))

    async def gen():
        emitted: list[dict[str, Any]] = []
        yield json.dumps({
            "event": "start",
            "route_id": req.route_id,
            "document_version": document_version,
            "total": len(criteria),
            "cached": len(cached_now),
            "cold": len(cold),
        }) + "\n"

        for r in cached_now:
            enriched = _enrich(r, by_id)
            emitted.append(enriched)
            yield json.dumps({"event": "result", "result": enriched}) + "\n"

        if cold:
            scorer = Scorer()
            sem = asyncio.Semaphore(SCORER_CONCURRENCY)
            queue: asyncio.Queue = asyncio.Queue()

            async def score_one(c: dict[str, Any], key: str) -> None:
                async with sem:
                    try:
                        r = await asyncio.to_thread(scorer.score, req.candidate, c)
                        cache[key] = r
                        await queue.put({**r, "_cache": "miss"})
                    except Exception as e:
                        await queue.put({
                            "criterion_id": c["id"],
                            "error": str(e),
                            "scored_at": datetime.now(timezone.utc).isoformat(),
                        })

            tasks = [asyncio.create_task(score_one(c, k)) for c, k in cold]
            for _ in range(len(cold)):
                r = await queue.get()
                enriched = _enrich(r, by_id)
                emitted.append(enriched)
                yield json.dumps({"event": "result", "result": enriched}) + "\n"
            await asyncio.gather(*tasks)
            _save_cache(cache)

        yield json.dumps({"event": "end", "summary": _summarise(emitted)}) + "\n"

    return StreamingResponse(gen(), media_type="application/x-ndjson")
