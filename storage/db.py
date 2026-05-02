"""
SQLite storage layer for the POC. Mirrors the Postgres schema in strategy_memo.md
section 9. Swap-compatible: a Supabase Postgres adapter implementing the same
methods is the v1 production path.
"""

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable


class Database:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path)
        self.conn.row_factory = sqlite3.Row
        self._migrate()

    def _migrate(self) -> None:
        cur = self.conn.cursor()
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS routes (
                route_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                gov_uk_url TEXT,
                html_url TEXT,
                pdf_url TEXT,
                polling_cadence_days INTEGER,
                enabled INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS documents (
                document_id INTEGER PRIMARY KEY AUTOINCREMENT,
                route_id TEXT NOT NULL,
                fetched_at TEXT NOT NULL,
                version_string TEXT,
                content_hash TEXT NOT NULL,
                html_text TEXT,
                last_modified_header TEXT,
                etag_header TEXT,
                source_type TEXT NOT NULL DEFAULT 'html',
                source_url TEXT,
                page_count INTEGER,
                FOREIGN KEY (route_id) REFERENCES routes(route_id)
            );

            CREATE INDEX IF NOT EXISTS idx_documents_route_fetched
                ON documents (route_id, fetched_at DESC);

            CREATE TABLE IF NOT EXISTS criteria (
                criterion_id TEXT NOT NULL,
                document_id INTEGER NOT NULL,
                structured_json TEXT NOT NULL,
                source_anchor_json TEXT,
                lifecycle_json TEXT,
                indexed_at TEXT NOT NULL,
                PRIMARY KEY (criterion_id, document_id),
                FOREIGN KEY (document_id) REFERENCES documents(document_id)
            );

            CREATE INDEX IF NOT EXISTS idx_criteria_id ON criteria (criterion_id);

            CREATE TABLE IF NOT EXISTS criteria_history (
                history_id INTEGER PRIMARY KEY AUTOINCREMENT,
                criterion_id TEXT NOT NULL,
                document_version TEXT,
                changed_fields_json TEXT,
                change_class TEXT,
                changed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS candidates (
                candidate_id TEXT PRIMARY KEY,
                profile_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS scoring_runs (
                run_id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id TEXT NOT NULL,
                criterion_id TEXT NOT NULL,
                probability REAL,
                confidence_level TEXT,
                evidence_json TEXT,
                model_version TEXT,
                scored_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_scoring_candidate
                ON scoring_runs (candidate_id, scored_at DESC);

            CREATE TABLE IF NOT EXISTS outcomes (
                outcome_id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id TEXT NOT NULL,
                route_id TEXT NOT NULL,
                decision TEXT,
                decision_date TEXT,
                source TEXT
            );

            CREATE TABLE IF NOT EXISTS evaluation_runs (
                run_id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluator_module TEXT NOT NULL,
                gold_set_version TEXT,
                metrics_json TEXT,
                run_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS alerts (
                alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
                route_id TEXT NOT NULL,
                criterion_id TEXT,
                change_class TEXT,
                payload_json TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        # Idempotent backfill for pre-existing databases that don't yet have the
        # source_type / source_url / page_count columns on documents. SQLite has
        # no IF NOT EXISTS for ADD COLUMN, so we introspect first.
        existing = {row["name"] for row in self.conn.execute("PRAGMA table_info(documents)").fetchall()}
        for col, ddl in (
            ("source_type", "ALTER TABLE documents ADD COLUMN source_type TEXT NOT NULL DEFAULT 'html'"),
            ("source_url", "ALTER TABLE documents ADD COLUMN source_url TEXT"),
            ("page_count", "ALTER TABLE documents ADD COLUMN page_count INTEGER"),
        ):
            if col not in existing:
                self.conn.execute(ddl)
        self.conn.commit()

    def upsert_route(self, route: dict[str, Any]) -> None:
        self.conn.execute(
            """
            INSERT INTO routes (route_id, name, html_url, pdf_url, polling_cadence_days, enabled)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(route_id) DO UPDATE SET
                name = excluded.name,
                html_url = excluded.html_url,
                pdf_url = excluded.pdf_url,
                polling_cadence_days = excluded.polling_cadence_days,
                enabled = excluded.enabled
            """,
            (
                route["id"],
                route["name"],
                route.get("html_url"),
                route.get("pdf_url"),
                route.get("polling_cadence_days", 7),
                1 if route.get("enabled", True) else 0,
            ),
        )
        self.conn.commit()

    def insert_document(
        self,
        route_id: str,
        fetched_at: str,
        version_string: str | None,
        content_hash: str,
        html_text: str | None,
        last_modified_header: str | None = None,
        etag_header: str | None = None,
        source_type: str = "html",
        source_url: str | None = None,
        page_count: int | None = None,
    ) -> int:
        cur = self.conn.execute(
            """
            INSERT INTO documents
                (route_id, fetched_at, version_string, content_hash, html_text,
                 last_modified_header, etag_header, source_type, source_url, page_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                route_id,
                fetched_at,
                version_string,
                content_hash,
                html_text,
                last_modified_header,
                etag_header,
                source_type,
                source_url,
                page_count,
            ),
        )
        self.conn.commit()
        return cur.lastrowid

    def latest_document(self, route_id: str, source_type: str | None = "html") -> sqlite3.Row | None:
        # source_type defaults to 'html' so EXTRACTOR/SCORER/CHANGEFEED keep
        # operating on the structured HTML view; pass None to grab the most
        # recent fetch regardless of type.
        if source_type is None:
            return self.conn.execute(
                "SELECT * FROM documents WHERE route_id = ? ORDER BY fetched_at DESC LIMIT 1",
                (route_id,),
            ).fetchone()
        return self.conn.execute(
            "SELECT * FROM documents WHERE route_id = ? AND source_type = ? ORDER BY fetched_at DESC LIMIT 1",
            (route_id, source_type),
        ).fetchone()

    def previous_document(
        self, route_id: str, before_document_id: int, source_type: str | None = "html"
    ) -> sqlite3.Row | None:
        if source_type is None:
            return self.conn.execute(
                "SELECT * FROM documents WHERE route_id = ? AND document_id < ? ORDER BY document_id DESC LIMIT 1",
                (route_id, before_document_id),
            ).fetchone()
        return self.conn.execute(
            "SELECT * FROM documents WHERE route_id = ? AND source_type = ? AND document_id < ? ORDER BY document_id DESC LIMIT 1",
            (route_id, source_type, before_document_id),
        ).fetchone()

    def insert_criterion(
        self,
        criterion_id: str,
        document_id: int,
        structured: dict[str, Any],
        indexed_at: str,
    ) -> None:
        self.conn.execute(
            """
            INSERT OR REPLACE INTO criteria
                (criterion_id, document_id, structured_json, source_anchor_json, lifecycle_json, indexed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                criterion_id,
                document_id,
                json.dumps(structured),
                json.dumps(structured.get("source", {}).get("anchor", {})),
                json.dumps(structured.get("lifecycle", {})),
                indexed_at,
            ),
        )
        self.conn.commit()

    def criteria_for_document(self, document_id: int) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT structured_json FROM criteria WHERE document_id = ?",
            (document_id,),
        ).fetchall()
        return [json.loads(r["structured_json"]) for r in rows]

    def insert_history(
        self, criterion_id: str, document_version: str, changed_fields: dict, change_class: str, changed_at: str
    ) -> None:
        self.conn.execute(
            """
            INSERT INTO criteria_history
                (criterion_id, document_version, changed_fields_json, change_class, changed_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (criterion_id, document_version, json.dumps(changed_fields), change_class, changed_at),
        )
        self.conn.commit()

    def insert_candidate(self, candidate_id: str, profile: dict, created_at: str) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO candidates (candidate_id, profile_json, created_at) VALUES (?, ?, ?)",
            (candidate_id, json.dumps(profile), created_at),
        )
        self.conn.commit()

    def insert_scoring_run(
        self,
        candidate_id: str,
        criterion_id: str,
        probability: float,
        confidence_level: str,
        evidence: dict,
        model_version: str,
        scored_at: str,
    ) -> int:
        cur = self.conn.execute(
            """
            INSERT INTO scoring_runs
                (candidate_id, criterion_id, probability, confidence_level, evidence_json, model_version, scored_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                criterion_id,
                probability,
                confidence_level,
                json.dumps(evidence),
                model_version,
                scored_at,
            ),
        )
        self.conn.commit()
        return cur.lastrowid

    def insert_evaluation_run(
        self, module: str, gold_set_version: str, metrics: dict, run_at: str
    ) -> int:
        cur = self.conn.execute(
            """
            INSERT INTO evaluation_runs
                (evaluator_module, gold_set_version, metrics_json, run_at)
            VALUES (?, ?, ?, ?)
            """,
            (module, gold_set_version, json.dumps(metrics), run_at),
        )
        self.conn.commit()
        return cur.lastrowid

    def insert_alert(
        self, route_id: str, criterion_id: str | None, change_class: str, payload: dict, created_at: str
    ) -> None:
        self.conn.execute(
            """
            INSERT INTO alerts (route_id, criterion_id, change_class, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (route_id, criterion_id, change_class, json.dumps(payload), created_at),
        )
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()
