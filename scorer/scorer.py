"""
SCORER. Takes a candidate profile and a criterion, returns a calibrated probability
plus supporting evidence and missing inputs. Confidence bands are mapped from the
probability for user-facing surfaces.

Architecture choice (defended in strategy_memo.md section 7): three calibration
layers, the first of which (chain-of-thought prompting) is wired in v1. Layers 2
(temperature scaling) and 3 (per-modality curves) require accumulated outcome
data and ship in v1.1.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import anthropic

ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = ROOT / "shared"
PROMPT_PATH = SHARED_DIR / "scorer_system_prompt.md"
TOOL_SCHEMA_PATH = SHARED_DIR / "scorer_tool_schema.json"

MODEL = "claude-sonnet-4-6"

# Shared with the Next.js advisor UI at web-next/app/api/score/route.ts.
# Both consumers load the same canonical files so they cannot drift.
SCORING_TOOL = json.loads(TOOL_SCHEMA_PATH.read_text())


def _band_from_probability(p: float) -> str:
    """Map probability to confidence band. Mirrors web-next/lib/scoring.ts:bandFromProbability.
    Band thresholds documented in framework §06."""
    if p >= 0.85:
        return "high"
    if p >= 0.60:
        return "medium"
    if p >= 0.40:
        return "low"
    return "below_threshold"


class Scorer:
    def __init__(self, model: str = MODEL) -> None:
        self.client = anthropic.Anthropic(max_retries=6)
        self.model = model
        self.system_prompt = PROMPT_PATH.read_text()

    def score(self, candidate: dict[str, Any], criterion: dict[str, Any]) -> dict[str, Any]:
        trimmed_criterion = self._trim_criterion(criterion)
        user_message = (
            "Candidate profile:\n```json\n"
            + json.dumps(candidate, indent=2)
            + "\n```\n\nCriterion:\n```json\n"
            + json.dumps(trimmed_criterion, indent=2)
            + "\n```\n\nScore this candidate against this criterion. Call `record_scoring` exactly once."
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=768,
            system=self.system_prompt,
            tools=[SCORING_TOOL],
            tool_choice={"type": "tool", "name": "record_scoring"},
            messages=[{"role": "user", "content": user_message}],
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "record_scoring":
                result = dict(block.input)
                # confidence_level is no longer a tool field (the model would
                # otherwise sometimes return one inconsistent with its own
                # probability). Derive it post-call from the same threshold
                # table the Next.js consumer uses.
                result["confidence_level"] = _band_from_probability(
                    float(result.get("probability_meets", 0.0))
                )
                result["scored_at"] = datetime.now(timezone.utc).isoformat()
                result["model_version"] = self.model
                self._sanity_check(candidate, result)
                return result

        raise RuntimeError("SCORER produced no tool call (model declined to score)")

    def score_all(self, candidate: dict[str, Any], criteria: list[dict[str, Any]]) -> list[dict[str, Any]]:
        results = []
        for crit in criteria:
            try:
                results.append(self.score(candidate, crit))
            except (anthropic.APIError, RuntimeError) as e:
                results.append({
                    "criterion_id": crit["id"],
                    "error": str(e),
                    "scored_at": datetime.now(timezone.utc).isoformat(),
                })
        return results

    @staticmethod
    def _trim_criterion(criterion: dict[str, Any]) -> dict[str, Any]:
        """Strip fields the SCORER doesn't need (verbatim_text, lifecycle, html_extract).
        Cuts per-call input tokens by ~30%, lets us run 16 concurrent under the rate limit."""
        keep = {k: v for k, v in criterion.items() if k != "lifecycle"}
        source = keep.get("source", {})
        if source:
            anchor = {k: v for k, v in source.get("anchor", {}).items() if k not in ("verbatim_text", "html_extract")}
            keep["source"] = {**{k: v for k, v in source.items() if k != "anchor"}, "anchor": anchor}
        return keep

    @staticmethod
    def _sanity_check(candidate: dict[str, Any], result: dict[str, Any]) -> None:
        """
        Reject any supporting_evidence that references a candidate field that
        does not exist. Catches the dominant SCORER hallucination mode.
        """
        flat_keys = set()

        def collect(prefix: str, obj: Any) -> None:
            if isinstance(obj, dict):
                for k, v in obj.items():
                    full = f"{prefix}.{k}" if prefix else k
                    flat_keys.add(full)
                    flat_keys.add(k)
                    collect(full, v)

        collect("", candidate)

        cleaned: list[dict[str, Any]] = []
        flagged: list[dict[str, Any]] = []
        for ev in result.get("supporting_evidence", []):
            field = ev.get("field", "")
            if field and any(field == k or field.endswith("." + k) or k.endswith("." + field) for k in flat_keys):
                cleaned.append(ev)
            elif field == "" or field.lower() in ("none", "n/a"):
                continue
            else:
                flagged.append({"field": field, "reason": "field_not_in_candidate_profile"})

        result["supporting_evidence"] = cleaned
        if flagged:
            result["sanity_check_flags"] = flagged
