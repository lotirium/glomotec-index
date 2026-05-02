"""
EXTRACTOR. Turns prose sections into AssessableCriterion objects via Claude
Opus 4.7 with tool use. Output is validated against schema/assessable_criterion.json
before storage. Hallucination of source text is rejected by string-match.

Architecture choice (defended in strategy_memo.md section 5): prompt engineering
on a frontier model with tool use, deterministic temperature, JSON Schema
validation gate, verbatim_text round-trip check. No fine-tune, no RAG in v1.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import anthropic
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "schema" / "assessable_criterion.json"
SHARED_DIR = ROOT / "shared"
PROMPT_PATH = SHARED_DIR / "extractor_system_prompt.md"
TOOL_SCHEMA_PATH = SHARED_DIR / "extractor_tool_schema.json"

MODEL = "claude-opus-4-7"

# TODO(category): the next EXTRACTOR run should include `category`
# ("substantive" | "procedural") in the tool schema and prompt so it's
# auto-populated rather than hand-classified post-hoc. The schema definition
# now lists it as an optional field in framework §03; current criteria_*.json
# files were hand-classified once and need re-extraction to drop the manual
# step. Keep the existing required-field set unchanged when adding it.
#
# Shared with the Next.js live-pipeline demo at web-next/app/api/pipeline/extract/route.ts.
# Both consumers load the same canonical tool schema + system prompt; if they
# drift, EXTRACTOR drifts.
CRITERION_TOOL = json.loads(TOOL_SCHEMA_PATH.read_text())


class Extractor:
    def __init__(self, model: str = MODEL) -> None:
        self.client = anthropic.Anthropic()
        self.model = model
        self.system_prompt = PROMPT_PATH.read_text()
        schema = json.loads(SCHEMA_PATH.read_text())
        self.validator = Draft202012Validator(schema)

    def extract_section(
        self,
        route_id: str,
        document_url: str,
        document_version: str,
        section_heading: str,
        section_text: str,
    ) -> list[dict[str, Any]]:
        user_message = self._build_user_message(
            route_id=route_id,
            document_url=document_url,
            document_version=document_version,
            section_heading=section_heading,
            section_text=section_text,
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            tools=[CRITERION_TOOL],
            messages=[{"role": "user", "content": user_message}],
        )

        criteria: list[dict[str, Any]] = []
        for block in response.content:
            if block.type == "tool_use" and block.name == "record_criterion":
                criterion = block.input
                criterion = self._fill_source_defaults(
                    criterion=criterion,
                    route_id=route_id,
                    document_url=document_url,
                    document_version=document_version,
                    section_heading=section_heading,
                )
                if self._validate_and_filter(criterion=criterion, section_text=section_text):
                    criteria.append(criterion)

        return criteria

    @staticmethod
    def _build_user_message(
        route_id: str,
        document_url: str,
        document_version: str,
        section_heading: str,
        section_text: str,
    ) -> str:
        return (
            f"Route: {route_id}\n"
            f"Document URL: {document_url}\n"
            f"Document version: {document_version}\n"
            f"Section heading: {section_heading}\n\n"
            f"Section text:\n---\n{section_text}\n---\n\n"
            "Extract any assessable criteria from this section. If none, return no tool calls."
        )

    @staticmethod
    def _fill_source_defaults(
        criterion: dict[str, Any],
        route_id: str,
        document_url: str,
        document_version: str,
        section_heading: str,
    ) -> dict[str, Any]:
        criterion.setdefault("route", route_id)
        source = criterion.setdefault("source", {})
        source.setdefault("document_url", document_url)
        source.setdefault("document_version", document_version)
        anchor = source.setdefault("anchor", {})
        anchor.setdefault("section_heading", section_heading)
        return criterion

    def _validate_and_filter(self, criterion: dict[str, Any], section_text: str) -> bool:
        errors = sorted(self.validator.iter_errors(criterion), key=lambda e: e.path)
        if errors:
            return False

        verbatim = (
            criterion.get("source", {})
            .get("anchor", {})
            .get("verbatim_text", "")
            .strip()
        )
        if not verbatim:
            return False

        normalised_section = re.sub(r"\s+", " ", section_text).lower()
        normalised_verbatim = re.sub(r"\s+", " ", verbatim).lower()
        head = normalised_verbatim[:80]
        if head and head not in normalised_section:
            return False

        criterion.setdefault("lifecycle", {})
        criterion["lifecycle"].setdefault("version_first_seen", criterion["source"]["document_version"])
        criterion["lifecycle"].setdefault("last_modified_in_version", criterion["source"]["document_version"])
        criterion["lifecycle"].setdefault("last_change_class", "novel")
        return True

    def extract_document(
        self,
        route_id: str,
        document_url: str,
        document_version: str,
        sections: list[dict[str, Any]],
        max_sections: int | None = None,
    ) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        sections_to_process = sections if max_sections is None else sections[:max_sections]
        for i, section in enumerate(sections_to_process, start=1):
            print(f"  [{i}/{len(sections_to_process)}] {section['heading'][:60]}")
            try:
                criteria = self.extract_section(
                    route_id=route_id,
                    document_url=document_url,
                    document_version=document_version,
                    section_heading=section["heading"],
                    section_text=section["text"],
                )
            except anthropic.APIError as e:
                print(f"    extraction error: {e}")
                continue
            for c in criteria:
                print(f"    -> {c['id']}  ({c['modality']}/{c['assessment_mechanism']})")
                out.append(c)
        return out
