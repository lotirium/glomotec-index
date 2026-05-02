"""
INDEX entry point. Single command runs the full pipeline against the routes
flagged enabled in routes.yaml. With no flags: crawl, extract, store, run a
sample candidate through SCORER, evaluate against the golden set, print summary.

Examples:
    python run.py
    python run.py --crawl-only
    python run.py --extract
    python run.py --score examples/candidate_alex.json
    python run.py --evaluate
    python run.py --changefeed
    python run.py --max-sections 10        # limit extraction during dev
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from changefeed import Changefeed
from crawler import Crawler
from evaluator import Evaluator
from extractor import Extractor
from scorer import Scorer
from storage import Database

OUTPUT_DIR = ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
DB_PATH = OUTPUT_DIR / "index.sqlite"
ROUTES_PATH = ROOT / "routes.yaml"


def load_routes() -> list[dict]:
    config = yaml.safe_load(ROUTES_PATH.read_text())
    return [r for r in config["routes"] if r.get("enabled", True)]


def cmd_crawl(db: Database) -> dict:
    crawler = Crawler()
    summary: dict = {"fetches": []}
    try:
        for route in load_routes():
            db.upsert_route(route)
            print(f"\nCRAWLER: {route['id']}")
            result = crawler.fetch(route["html_url"])
            print(f"  HTML: {len(result.html_text)} bytes, hash {result.content_hash[:12]}, version: {result.version_string}")
            print(f"  {len(result.sections)} sections")

            doc_id = db.insert_document(
                route_id=route["id"],
                fetched_at=result.fetched_at,
                version_string=result.version_string,
                content_hash=result.content_hash,
                html_text=result.html_text,
                last_modified_header=result.last_modified_header,
                etag_header=result.etag_header,
                source_type="html",
                source_url=result.url,
            )

            sections_path = OUTPUT_DIR / f"sections_{route['id']}.json"
            sections_path.write_text(json.dumps({
                "route_id": route["id"],
                "document_id": doc_id,
                "url": result.url,
                "version_string": result.version_string,
                "fetched_at": result.fetched_at,
                "sections": result.sections,
            }, indent=2))
            print(f"  -> sections written to {sections_path.relative_to(ROOT)}")

            summary["fetches"].append({
                "route_id": route["id"],
                "document_id": doc_id,
                "source_type": "html",
                "section_count": len(result.sections),
                "version_string": result.version_string,
            })

            # PDF companion. routes.yaml lists pdf_url for every route; gov.uk
            # publication pages link the canonical caseworker PDF as the first
            # attachment. Persist alongside the HTML row with its own hash so
            # CHANGEFEED can later diff PDF against PDF if we ever flip the
            # route to PDF-canonical.
            pdf_url = route.get("pdf_url")
            if pdf_url:
                try:
                    pdf_result = crawler.fetch_pdf(pdf_url)
                except Exception as e:
                    print(f"  PDF: skipped ({e.__class__.__name__}: {e})")
                else:
                    print(
                        f"  PDF: {pdf_result.pdf_bytes_len} bytes, "
                        f"hash {pdf_result.content_hash[:12]}, "
                        f"{pdf_result.page_count} pages, version: {pdf_result.version_string}"
                    )
                    pdf_doc_id = db.insert_document(
                        route_id=route["id"],
                        fetched_at=pdf_result.fetched_at,
                        version_string=pdf_result.version_string,
                        content_hash=pdf_result.content_hash,
                        html_text=pdf_result.extracted_text,
                        last_modified_header=pdf_result.last_modified_header,
                        etag_header=pdf_result.etag_header,
                        source_type="pdf",
                        source_url=pdf_result.url,
                        page_count=pdf_result.page_count,
                    )
                    pdf_sections_path = OUTPUT_DIR / f"sections_{route['id']}_pdf.json"
                    pdf_sections_path.write_text(json.dumps({
                        "route_id": route["id"],
                        "document_id": pdf_doc_id,
                        "source_type": "pdf",
                        "url": pdf_result.url,
                        "version_string": pdf_result.version_string,
                        "fetched_at": pdf_result.fetched_at,
                        "page_count": pdf_result.page_count,
                        "sections": pdf_result.sections,
                    }, indent=2))
                    print(f"  -> PDF text written to {pdf_sections_path.relative_to(ROOT)}")
                    summary["fetches"].append({
                        "route_id": route["id"],
                        "document_id": pdf_doc_id,
                        "source_type": "pdf",
                        "page_count": pdf_result.page_count,
                        "section_count": len(pdf_result.sections),
                        "version_string": pdf_result.version_string,
                    })
    finally:
        crawler.close()
    return summary


def cmd_extract(db: Database, max_sections: int | None = None) -> dict:
    extractor = Extractor()
    summary: dict = {"extractions": []}
    for route in load_routes():
        latest = db.latest_document(route["id"])
        if not latest:
            print(f"EXTRACTOR: {route['id']} has no fetched document; run --crawl-only first")
            continue
        sections_path = OUTPUT_DIR / f"sections_{route['id']}.json"
        if not sections_path.exists():
            print(f"EXTRACTOR: missing sections file at {sections_path}; re-run --crawl-only")
            continue
        sections_data = json.loads(sections_path.read_text())
        print(f"\nEXTRACTOR: {route['id']} ({len(sections_data['sections'])} sections)")

        criteria = extractor.extract_document(
            route_id=route["id"],
            document_url=sections_data["url"],
            document_version=sections_data.get("version_string") or "unknown",
            sections=sections_data["sections"],
            max_sections=max_sections,
        )

        indexed_at = datetime.now(timezone.utc).isoformat()
        for c in criteria:
            db.insert_criterion(c["id"], latest["document_id"], c, indexed_at)

        criteria_path = OUTPUT_DIR / f"criteria_{route['id']}.json"
        criteria_path.write_text(json.dumps(criteria, indent=2))
        print(f"  -> {len(criteria)} criteria written to {criteria_path.relative_to(ROOT)}")

        summary["extractions"].append({
            "route_id": route["id"],
            "document_id": latest["document_id"],
            "criteria_count": len(criteria),
        })
    return summary


def cmd_changefeed(db: Database) -> dict:
    summary: dict = {"events": []}
    for route in load_routes():
        latest = db.latest_document(route["id"])
        if not latest:
            continue
        prior = db.previous_document(route["id"], latest["document_id"])
        if not prior:
            print(f"CHANGEFEED: {route['id']} has no prior version, skipping")
            continue
        if not Changefeed.compare_byte_hash(prior["content_hash"], latest["content_hash"]):
            print(f"CHANGEFEED: {route['id']} byte-identical, no change")
            continue

        prior_criteria = db.criteria_for_document(prior["document_id"])
        current_criteria = db.criteria_for_document(latest["document_id"])
        events = Changefeed.compare_criteria(prior_criteria, current_criteria)
        print(f"\nCHANGEFEED: {route['id']} {len(events)} events")
        for ev in events:
            alert = Changefeed.render_alert(route["id"], ev)
            print(f"  [{alert['change_class']}/{alert['priority']}] {alert['summary']}")
            db.insert_alert(
                route_id=route["id"],
                criterion_id=ev["criterion_id"],
                change_class=ev["change_class"],
                payload=alert,
                created_at=alert["alerted_at"],
            )
            db.insert_history(
                criterion_id=ev["criterion_id"],
                document_version=latest["version_string"] or "unknown",
                changed_fields=ev["changed_fields"],
                change_class=ev["change_class"],
                changed_at=alert["alerted_at"],
            )
            summary["events"].append(alert)

        alerts_path = OUTPUT_DIR / "alerts.jsonl"
        with alerts_path.open("a") as f:
            for ev in events:
                f.write(json.dumps(Changefeed.render_alert(route["id"], ev)) + "\n")
    return summary


def cmd_score(db: Database, candidate_path: Path) -> dict:
    candidate = json.loads(candidate_path.read_text())
    candidate_id = candidate["candidate_id"]
    db.insert_candidate(candidate_id, candidate, datetime.now(timezone.utc).isoformat())

    scorer = Scorer()
    summary: dict = {"runs": []}
    for route in load_routes():
        latest = db.latest_document(route["id"])
        if not latest:
            continue
        criteria = db.criteria_for_document(latest["document_id"])
        if not criteria:
            print(f"SCORER: {route['id']} has no criteria yet, skipping")
            continue
        print(f"\nSCORER: {candidate_id} against {len(criteria)} criteria for {route['id']}")
        results = scorer.score_all(candidate, criteria)
        for r in results:
            if "error" in r:
                print(f"  [error] {r['criterion_id']}: {r['error']}")
                continue
            db.insert_scoring_run(
                candidate_id=candidate_id,
                criterion_id=r["criterion_id"],
                probability=r["probability_meets"],
                confidence_level=r["confidence_level"],
                evidence={
                    "supporting_evidence": r.get("supporting_evidence", []),
                    "missing_inputs": r.get("missing_inputs", []),
                    "reasoning": r.get("reasoning", ""),
                    "sanity_check_flags": r.get("sanity_check_flags", []),
                },
                model_version=r.get("model_version", "unknown"),
                scored_at=r["scored_at"],
            )
            print(f"  {r['criterion_id']}: {r['probability_meets']:.2f} ({r['confidence_level']})")
            summary["runs"].append(r)

        scoring_path = OUTPUT_DIR / f"scoring_{candidate_id}_{route['id']}.json"
        scoring_path.write_text(json.dumps(results, indent=2))
        print(f"  -> scoring results written to {scoring_path.relative_to(ROOT)}")

    return summary


def cmd_evaluate(db: Database) -> dict:
    extractor = Extractor()
    evaluator = Evaluator(extractor)
    print("\nEVALUATOR: running golden set against EXTRACTOR")
    result = evaluator.run()
    db.insert_evaluation_run(
        module="EXTRACTOR",
        gold_set_version=result["gold_set_version"],
        metrics={"pass_rate": result["pass_rate"], "passed": result["passed"], "total": result["total_entries"]},
        run_at=result["run_at"],
    )
    eval_path = OUTPUT_DIR / "evaluation_run.json"
    eval_path.write_text(json.dumps(result, indent=2))
    print(f"  pass rate: {result['passed']}/{result['total_entries']} = {result['pass_rate']:.2%}")
    print(f"  -> full report at {eval_path.relative_to(ROOT)}")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="INDEX: glomotec regulatory intelligence layer (POC)")
    parser.add_argument("--crawl-only", action="store_true", help="run CRAWLER only")
    parser.add_argument("--extract", action="store_true", help="run CRAWLER then EXTRACTOR")
    parser.add_argument("--changefeed", action="store_true", help="run CHANGEFEED only")
    parser.add_argument("--score", type=str, help="path to candidate profile JSON to score")
    parser.add_argument("--evaluate", action="store_true", help="run EVALUATOR only")
    parser.add_argument("--max-sections", type=int, default=None, help="cap sections processed (dev)")
    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY") and (args.extract or args.score or args.evaluate or not any([args.crawl_only, args.changefeed])):
        print("warning: ANTHROPIC_API_KEY not set. Crawl-only and changefeed work without it; extract/score/evaluate need it.")

    db = Database(DB_PATH)
    try:
        if args.crawl_only:
            cmd_crawl(db)
        elif args.extract:
            cmd_crawl(db)
            cmd_extract(db, max_sections=args.max_sections)
        elif args.changefeed:
            cmd_changefeed(db)
        elif args.score:
            cmd_score(db, Path(args.score))
        elif args.evaluate:
            cmd_evaluate(db)
        else:
            cmd_crawl(db)
            cmd_extract(db, max_sections=args.max_sections)
            cmd_changefeed(db)
            cmd_score(db, ROOT / "examples" / "candidate_alex.json")
            cmd_evaluate(db)
            print("\n=== INDEX run complete. Database: output/index.sqlite ===")
    finally:
        db.close()


if __name__ == "__main__":
    main()
