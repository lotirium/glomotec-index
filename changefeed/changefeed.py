"""
CHANGEFEED. Diffs document versions in three layers: byte hash, structural
section comparison, criterion-id-level comparison. Classifies each change into
{numeric, pathway, process, cosmetic}.

Architecture choice (defended in strategy_memo.md section 6): a stack of A then
B then D, deliberately not C (semantic embedding distance is the wrong tool;
it inversely correlates with downstream impact).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


class Changefeed:
    @staticmethod
    def compare_byte_hash(prior_hash: str, current_hash: str) -> bool:
        """Layer A: byte-level. Returns True if any change at all."""
        return prior_hash != current_hash

    @staticmethod
    def compare_criteria(
        prior_criteria: list[dict[str, Any]], current_criteria: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Layer D: criterion-level diff. Returns a list of change events. Each event
        has criterion_id, change_class, and changed_fields.
        """
        prior_by_id = {c["id"]: c for c in prior_criteria}
        current_by_id = {c["id"]: c for c in current_criteria}

        events: list[dict[str, Any]] = []

        for cid, current in current_by_id.items():
            if cid not in prior_by_id:
                events.append({
                    "criterion_id": cid,
                    "change_class": "pathway",
                    "changed_fields": {"added": True, "criterion": current},
                    "summary": f"Criterion {cid} added in this version.",
                })
                continue

            prior = prior_by_id[cid]
            classification = Changefeed._classify_change(prior, current)
            if classification:
                events.append({
                    "criterion_id": cid,
                    "change_class": classification["class"],
                    "changed_fields": classification["fields"],
                    "summary": classification["summary"],
                })

        for cid in prior_by_id:
            if cid not in current_by_id:
                events.append({
                    "criterion_id": cid,
                    "change_class": "pathway",
                    "changed_fields": {"removed": True, "criterion": prior_by_id[cid]},
                    "summary": f"Criterion {cid} removed in this version.",
                })

        return events

    @staticmethod
    def _classify_change(prior: dict[str, Any], current: dict[str, Any]) -> dict[str, Any] | None:
        if Changefeed._thresholds_changed(prior.get("thresholds", []), current.get("thresholds", [])):
            return {
                "class": "numeric",
                "fields": {"thresholds": {"before": prior.get("thresholds"), "after": current.get("thresholds")}},
                "summary": f"Thresholds changed in {prior['id']}.",
            }

        if Changefeed._exceptions_changed(prior.get("exceptions", []), current.get("exceptions", [])):
            return {
                "class": "pathway",
                "fields": {"exceptions": {"before": prior.get("exceptions"), "after": current.get("exceptions")}},
                "summary": f"Exceptions changed in {prior['id']}.",
            }

        process_fields = ("burden_allocation", "default_behaviour", "trigger_for_departure")
        for field in process_fields:
            if prior.get(field) != current.get(field):
                return {
                    "class": "process",
                    "fields": {field: {"before": prior.get(field), "after": current.get(field)}},
                    "summary": f"{field} changed in {prior['id']}.",
                }

        prior_anchor = prior.get("source", {}).get("anchor", {}).get("verbatim_text", "")
        current_anchor = current.get("source", {}).get("anchor", {}).get("verbatim_text", "")
        if prior_anchor != current_anchor:
            return {
                "class": "cosmetic",
                "fields": {"verbatim_text": {"before_len": len(prior_anchor), "after_len": len(current_anchor)}},
                "summary": f"Source prose reworded for {prior['id']} (no structural change).",
            }

        return None

    @staticmethod
    def _thresholds_changed(prior: list[dict], current: list[dict]) -> bool:
        if len(prior) != len(current):
            return True
        for p, c in zip(prior, current):
            for key in ("value", "unit", "direction", "scope"):
                if p.get(key) != c.get(key):
                    return True
        return False

    @staticmethod
    def _exceptions_changed(prior: list[dict], current: list[dict]) -> bool:
        prior_conditions = sorted([e.get("condition", "") for e in prior])
        current_conditions = sorted([e.get("condition", "") for e in current])
        return prior_conditions != current_conditions

    @staticmethod
    def alert_priority(change_class: str) -> str:
        return {
            "numeric": "alert_immediate",
            "pathway": "alert_immediate",
            "process": "alert_digest",
            "cosmetic": "log_only",
        }.get(change_class, "log_only")

    @staticmethod
    def render_alert(route_id: str, event: dict[str, Any]) -> dict[str, Any]:
        return {
            "route_id": route_id,
            "criterion_id": event["criterion_id"],
            "change_class": event["change_class"],
            "summary": event["summary"],
            "priority": Changefeed.alert_priority(event["change_class"]),
            "changed_fields": event["changed_fields"],
            "alerted_at": datetime.now(timezone.utc).isoformat(),
        }
