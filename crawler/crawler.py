"""
CRAWLER. Fetches gov.uk caseworker guidance HTML, captures version metadata,
content-addresses fetches so the next layer can detect 'is this byte-identical
to the last version?' cheaply.

Architecture choice (defended in strategy_memo.md section 4): httpx for fetching,
selectolax for parsing, no headless browser, no vector store at this layer.
"""

from __future__ import annotations

import hashlib
import io
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
from selectolax.parser import HTMLParser


@dataclass
class FetchResult:
    url: str
    fetched_at: str
    http_status: int
    content_hash: str
    html_text: str
    rendered_text: str
    version_string: str | None
    last_modified_header: str | None
    etag_header: str | None
    sections: list[dict[str, Any]]


@dataclass
class PdfFetchResult:
    url: str
    fetched_at: str
    http_status: int
    content_hash: str
    pdf_bytes_len: int
    extracted_text: str
    page_count: int
    version_string: str | None
    last_modified_header: str | None
    etag_header: str | None
    sections: list[dict[str, Any]]


VERSION_PATTERN = re.compile(r"\bversion\s+(\d+(?:\.\d+)?)\b", re.IGNORECASE)
LAST_UPDATED_PATTERN = re.compile(
    r"(?:Last updated|Updated|Version)\s*:?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", re.IGNORECASE
)


class Crawler:
    def __init__(self, user_agent: str = "glomotec-index/0.1 (+https://glomotec.com)") -> None:
        self.client = httpx.Client(
            timeout=httpx.Timeout(30.0),
            follow_redirects=True,
            headers={"User-Agent": user_agent},
        )

    def fetch(self, url: str) -> FetchResult:
        resp = self.client.get(url)
        resp.raise_for_status()
        html_text = resp.text
        content_hash = hashlib.sha256(html_text.encode("utf-8")).hexdigest()

        tree = HTMLParser(html_text)
        rendered_text = self._render_text(tree)
        version_string = self._extract_version(rendered_text)
        sections = self._extract_sections(tree)

        return FetchResult(
            url=url,
            fetched_at=datetime.now(timezone.utc).isoformat(),
            http_status=resp.status_code,
            content_hash=content_hash,
            html_text=html_text,
            rendered_text=rendered_text,
            version_string=version_string,
            last_modified_header=resp.headers.get("last-modified"),
            etag_header=resp.headers.get("etag"),
            sections=sections,
        )

    @staticmethod
    def _render_text(tree: HTMLParser) -> str:
        main = tree.css_first("main") or tree.body
        if main is None:
            return tree.text(separator="\n")
        return main.text(separator="\n")

    @staticmethod
    def _extract_version(rendered_text: str) -> str | None:
        version_match = VERSION_PATTERN.search(rendered_text)
        date_match = LAST_UPDATED_PATTERN.search(rendered_text)
        parts = []
        if version_match:
            parts.append(f"v{version_match.group(1)}")
        if date_match:
            parts.append(date_match.group(1))
        return " ".join(parts) if parts else None

    @staticmethod
    def _extract_sections(tree: HTMLParser) -> list[dict[str, Any]]:
        """
        Walk the DOM in document order and group paragraph-level content under
        the most recent heading. This produces the input units EXTRACTOR
        consumes one section at a time.
        """
        # gov.uk caseworker guidance uses .govspeak / .gem-c-govspeak for the
        # body content. Falling back gracefully covers other document layouts.
        main = (
            tree.css_first(".govspeak")
            or tree.css_first(".gem-c-govspeak")
            or tree.css_first("main")
            or tree.body
        )
        if main is None:
            return []

        # selectolax css() groups results by selector; traverse() walks the
        # tree depth-first in document order, which is what we need to
        # group paragraphs under their preceding heading.
        nodes = [n for n in main.traverse() if n.tag in ("h1", "h2", "h3", "h4", "p", "li")]

        sections: list[dict[str, Any]] = []
        current_heading = "Introduction"
        current_heading_level = 0
        current_paragraphs: list[str] = []

        def flush() -> None:
            if current_paragraphs:
                sections.append({
                    "heading": current_heading,
                    "level": current_heading_level,
                    "text": "\n\n".join(current_paragraphs).strip(),
                })

        for node in nodes:
            if node.tag in ("h1", "h2", "h3", "h4"):
                flush()
                current_paragraphs = []
                current_heading = node.text(strip=True) or current_heading
                current_heading_level = int(node.tag[1])
            else:  # p or li
                text = node.text(strip=True)
                if text:
                    current_paragraphs.append(text)

        flush()

        return [s for s in sections if len(s["text"]) > 80]

    def fetch_pdf(self, url: str) -> PdfFetchResult:
        """
        Fetch the PDF that gov.uk links from caseworker guidance landing pages.
        gov.uk attachments redirect twice (publication page → assets host); httpx
        handles that with follow_redirects. The first PDF on the publication page
        is the canonical caseworker guidance bundle; we extract text via pdfplumber
        and treat the result as a parallel content source to the HTML — separate
        hash, separate document row.
        """
        # Imported lazily so test environments without pdfplumber can still
        # exercise the HTML path.
        import pdfplumber

        publication_url = url
        if "/publications/" in url and not url.lower().endswith(".pdf"):
            publication_url = self._resolve_pdf_attachment(url)

        resp = self.client.get(publication_url)
        resp.raise_for_status()
        pdf_bytes = resp.content
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()

        extracted_text_parts: list[str] = []
        sections: list[dict[str, Any]] = []
        page_count = 0
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            page_count = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                extracted_text_parts.append(page_text)
                if page_text.strip():
                    sections.append({
                        "heading": f"Page {i + 1}",
                        "level": 2,
                        "text": page_text.strip(),
                    })

        extracted_text = "\n\n".join(extracted_text_parts)
        version_string = self._extract_version(extracted_text)

        return PdfFetchResult(
            url=publication_url,
            fetched_at=datetime.now(timezone.utc).isoformat(),
            http_status=resp.status_code,
            content_hash=content_hash,
            pdf_bytes_len=len(pdf_bytes),
            extracted_text=extracted_text,
            page_count=page_count,
            version_string=version_string,
            last_modified_header=resp.headers.get("last-modified"),
            etag_header=resp.headers.get("etag"),
            sections=[s for s in sections if len(s["text"]) > 80],
        )

    def _resolve_pdf_attachment(self, publication_url: str) -> str:
        """
        gov.uk publication pages list one or more downloadable attachments. The
        first .pdf attachment under the publication-attachments block is the
        canonical caseworker bundle. If we can't find one, fall back to the
        original URL so the caller surfaces the error.
        """
        resp = self.client.get(publication_url)
        resp.raise_for_status()
        tree = HTMLParser(resp.text)
        for a in tree.css("a"):
            href = a.attributes.get("href", "") or ""
            if href.lower().endswith(".pdf"):
                if href.startswith("//"):
                    return "https:" + href
                if href.startswith("/"):
                    return "https://www.gov.uk" + href
                return href
        return publication_url

    def close(self) -> None:
        self.client.close()
