"""
Per-profile aggregator. Takes a list of SCORER results plus the criteria they
were scored against, returns the same envelope shape the Next.js advisor UI
computes in lib/scoring.ts:computeAggregates(). Both surfaces apply the same
cap rule, so a profile's substantive_pct, submission_pct and suitability_pct
read identically whether the run was Python or Next.js.

Cap rule: each *_pct is the arithmetic mean of probability_meets * 100 across
criteria in that category, but capped at 50 when ANY criterion in the
category falls below probability_meets 0.35. The cap exists because a
vacuously-satisfied universal eligibility criterion ("applicant must be 18
or over") scores ~1.0 for almost everyone and inflates the mean even when a
load-bearing criterion in the same category clearly failed. Without the
cap, dealbreakers reflected in per-criterion output can be hidden by the
aggregate. The cap applies identically to suitability.

Suitability gate: when suitability_pct is non-null and below 50 (any real
refusal risk), the verdict headline is overridden to "Refusal risk
identified" regardless of how strong substantive and procedural look.
"""

from __future__ import annotations

from typing import Any, Iterable

BELOW_THRESHOLD_PROB = 0.35
CAPPED_READINESS = 50
SUITABILITY_GATE_PCT = 50


def _band_from_pct(pct: int) -> str:
    if pct >= 80:
        return "high"
    if pct >= 60:
        return "medium"
    if pct >= 40:
        return "low"
    return "below_threshold"


def _category_readiness(total_p: float, count: int, any_below: bool) -> int:
    if count == 0:
        return 0
    arithmetic_mean = round(total_p / count * 100)
    if any_below:
        return min(arithmetic_mean, CAPPED_READINESS)
    return arithmetic_mean


def _headline_from_bands(
    substantive: str, submission: str, suitability_pct: int | None
) -> dict[str, str]:
    """Mirrors web-next/lib/scoring.ts:headlineFromBands."""
    if suitability_pct is not None and suitability_pct < SUITABILITY_GATE_PCT:
        return {"headline": "Refusal risk identified", "verdict_class": "low"}
    if substantive == "below_threshold":
        return {"headline": "Not yet", "verdict_class": "low"}
    if substantive == "low":
        return {"headline": "Notable gaps", "verdict_class": "low"}
    if substantive == "medium":
        return {"headline": "Mixed signals", "verdict_class": "medium"}
    if submission == "high":
        return {"headline": "Strong match", "verdict_class": "high"}
    return {
        "headline": "Strong candidate, preparation needed",
        "verdict_class": "high",
    }


def build_assessment_run(
    *,
    client_slug: str,
    route_id: str,
    results: Iterable[dict[str, Any]],
    criteria_index: dict[str, dict[str, Any]],
    scored_at: str,
) -> dict[str, Any]:
    """
    Build the same envelope the Next.js getAssessment() flow builds.

    Args:
        client_slug: stable slug, e.g. "alex-mendez".
        route_id: route the profile was scored against.
        results: SCORER per-criterion results (probability_meets, confidence_level, ...).
        criteria_index: mapping {criterion_id -> criterion_dict} so we can look up the
            `category` field. Falls back to "procedural" when missing.
        scored_at: ISO timestamp of the run.
    """
    summary = {
        "high": 0,
        "medium": 0,
        "low": 0,
        "below_threshold": 0,
        "error": 0,
    }

    def _empty_cat() -> dict[str, Any]:
        return {
            "count": 0,
            "total_p": 0.0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "below_threshold": 0,
            "any_below": False,
        }

    sub = _empty_cat()
    proc = _empty_cat()
    suit = _empty_cat()

    results = list(results)
    for r in results:
        if r.get("error"):
            summary["error"] += 1
            continue
        confidence = r.get("confidence_level", "below_threshold")
        if confidence in summary:
            summary[confidence] += 1
        criterion = criteria_index.get(r["criterion_id"], {})
        category = criterion.get("category", "procedural")
        if category == "substantive":
            target = sub
        elif category == "suitability":
            target = suit
        else:
            target = proc
        target["count"] += 1
        target["total_p"] += float(r.get("probability_meets", 0.0))
        if confidence in ("high", "medium", "low", "below_threshold"):
            target[confidence] += 1
        if float(r.get("probability_meets", 0.0)) < BELOW_THRESHOLD_PROB:
            target["any_below"] = True

    total = max(1, sum(1 for r in results if not r.get("error")))
    overall_pct = round(
        sum(r.get("probability_meets", 0.0) for r in results if not r.get("error")) / total * 100
    )
    substantive_pct = _category_readiness(sub["total_p"], sub["count"], sub["any_below"])
    submission_pct = _category_readiness(proc["total_p"], proc["count"], proc["any_below"])
    suitability_pct = (
        None
        if suit["count"] == 0
        else _category_readiness(suit["total_p"], suit["count"], suit["any_below"])
    )

    sub_band = _band_from_pct(substantive_pct)
    sub_band_submission = _band_from_pct(submission_pct)
    headline = _headline_from_bands(sub_band, sub_band_submission, suitability_pct)

    def _strip(s: dict) -> dict:
        return {
            "count": s["count"],
            "high": s["high"],
            "medium": s["medium"],
            "low": s["low"],
            "below_threshold": s["below_threshold"],
        }

    return {
        "client_slug": client_slug,
        "route_id": route_id,
        "scored_at": scored_at,
        "total": len(results),
        "cached": 0,
        "cold": len(results),
        "results": results,
        "summary": summary,
        "overall_pct": overall_pct,
        "substantive_pct": substantive_pct,
        "submission_pct": submission_pct,
        "suitability_pct": suitability_pct,
        "category_summary": {
            "substantive": _strip(sub),
            "procedural": _strip(proc),
            "suitability": _strip(suit),
        },
        "verdict_class": headline["verdict_class"],
        "verdict_headline": headline["headline"],
    }
