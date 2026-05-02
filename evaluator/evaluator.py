"""
EVALUATOR. Re-runs EXTRACTOR against the hand-labelled golden set and reports
match metrics: id-pattern match, modality match, mechanism match, decision_stage
match, threshold count match, burden_allocation coverage, structural fields
present.

Architecture choice (defended in strategy_memo.md section 8): three evaluation
streams. This module wires stream 1 (extraction accuracy). Streams 2 (scoring
calibration) and 3 (change detection precision/recall) come online when
outcome data and a manually annotated changelog accumulate.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from extractor import Extractor

ROOT = Path(__file__).resolve().parent.parent
GOLDEN_PATH = ROOT / "evaluator" / "golden_set.json"


class Evaluator:
    def __init__(self, extractor: Extractor) -> None:
        self.extractor = extractor
        self.golden = json.loads(GOLDEN_PATH.read_text())

    def run(
        self,
        route_id: str = "innovator_founder",
        document_url: str = "https://www.gov.uk/government/publications/innovator-appendix-w-workers/innovator-founder-caseworker-guidance-accessible",
        document_version: str = "v10.0",
    ) -> dict[str, Any]:
        per_entry: list[dict[str, Any]] = []
        passed = 0
        total = len(self.golden["entries"])

        for entry in self.golden["entries"]:
            extracted = self.extractor.extract_section(
                route_id=route_id,
                document_url=document_url,
                document_version=document_version,
                section_heading=entry["section_heading"],
                section_text=entry["section_text"],
            )
            check = self._check_entry(entry, extracted)
            per_entry.append(check)
            if check["passed"]:
                passed += 1

        return {
            "module": "EXTRACTOR",
            "gold_set_version": self.golden["version"],
            "total_entries": total,
            "passed": passed,
            "pass_rate": passed / total if total else 0.0,
            "per_entry": per_entry,
            "run_at": datetime.now(timezone.utc).isoformat(),
        }

    def _check_entry(self, entry: dict[str, Any], extracted: list[dict[str, Any]]) -> dict[str, Any]:
        expected = entry["expected"]
        if not extracted:
            return {
                "section_heading": entry["section_heading"],
                "passed": False,
                "reason": "no_criteria_extracted",
                "checks": {},
            }

        best = None
        best_score = -1
        for c in extracted:
            score = self._score_match(c, expected)
            if score > best_score:
                best_score = score
                best = c

        checks = self._run_checks(best or {}, expected)
        passed = all(checks.values())
        return {
            "section_heading": entry["section_heading"],
            "best_extracted_id": (best or {}).get("id"),
            "passed": passed,
            "checks": checks,
        }

    @staticmethod
    def _score_match(criterion: dict[str, Any], expected: dict[str, Any]) -> int:
        score = 0
        if expected.get("id_pattern", "") in criterion.get("id", ""):
            score += 3
        if criterion.get("modality") == expected.get("modality"):
            score += 2
        if criterion.get("assessment_mechanism") == expected.get("assessment_mechanism"):
            score += 2
        if criterion.get("decision_stage") == expected.get("decision_stage"):
            score += 1
        return score

    @staticmethod
    def _run_checks(criterion: dict[str, Any], expected: dict[str, Any]) -> dict[str, bool]:
        checks: dict[str, bool] = {}

        if "id_pattern" in expected:
            checks["id_pattern"] = expected["id_pattern"] in criterion.get("id", "")

        if "modality" in expected:
            checks["modality"] = criterion.get("modality") == expected["modality"]

        if "assessment_mechanism" in expected:
            checks["assessment_mechanism"] = criterion.get("assessment_mechanism") == expected["assessment_mechanism"]

        if "decision_stage" in expected:
            checks["decision_stage"] = criterion.get("decision_stage") == expected["decision_stage"]

        if "thresholds_count_min" in expected:
            checks["thresholds_count_min"] = len(criterion.get("thresholds") or []) >= expected["thresholds_count_min"]

        if "burden_includes" in expected:
            burden = criterion.get("burden_allocation", {})
            checks["burden_includes"] = all(
                burden.get(actor) for actor in expected["burden_includes"]
            )

        if expected.get("has_default_behaviour"):
            checks["has_default_behaviour"] = bool(criterion.get("default_behaviour"))

        if expected.get("has_trigger_for_departure"):
            checks["has_trigger_for_departure"] = bool(criterion.get("trigger_for_departure"))

        if expected.get("has_alternatives"):
            checks["has_alternatives"] = bool(criterion.get("alternatives"))

        if "alternatives_minimum_required" in expected:
            alts = criterion.get("alternatives") or {}
            checks["alternatives_minimum_required"] = alts.get("minimum_required") == expected["alternatives_minimum_required"]

        if "alternatives_options_min" in expected:
            alts = criterion.get("alternatives") or {}
            checks["alternatives_options_min"] = len(alts.get("options") or []) >= expected["alternatives_options_min"]

        if expected.get("has_cross_references"):
            checks["has_cross_references"] = len(criterion.get("cross_references") or []) > 0

        return checks
