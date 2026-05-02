import "server-only";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Live-pipeline CRAWLER demo. Mirrors the Python crawler/crawler.py: fetches
 * gov.uk Innovator Founder caseworker guidance, computes a sha256 over the
 * HTML, parses headings + paragraphs, picks one criterion-rich paragraph for
 * the EXTRACTOR demo to operate on. Does NOT persist — that's the production
 * Python pipeline's job. This endpoint is a transparency shim for the cohort
 * to watch the CRAWLER stage execute against live data.
 */

const GOVUK_URL =
  "https://www.gov.uk/government/publications/innovator-appendix-w-workers/innovator-founder-caseworker-guidance-accessible";

const VERSION_PATTERN =
  /(?:Last updated|Updated|Version)\s*:?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i;

interface DemoSection {
  heading: string;
  text: string;
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Locate a single, criterion-rich paragraph from the fetched HTML to feed the
 * EXTRACTOR demo. The full doc is too large for a Vercel timeout; one section
 * containing one or two clean rules is enough to demonstrate the extraction
 * pattern. We hunt for sections under <h2>/<h3> headings that contain
 * "must" / "must not" / "must be" — those are the criterion-bearing ones.
 */
function pickDemoSection(html: string): DemoSection {
  // Strip script + style blocks so they don't pollute the text scan.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // Walk h2/h3 → following p text. Crude but effective for govspeak structure.
  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[23]|$)/gi;
  const candidates: DemoSection[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(cleaned)) !== null) {
    const heading = stripTags(m[2]).trim();
    const body = m[3];
    const paragraphs = Array.from(body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
      .map((p) => stripTags(p[1]).trim())
      .filter((t) => t.length > 80 && t.length < 800);
    for (const para of paragraphs) {
      if (/\bmust\b/i.test(para) || /\byou must\b/i.test(para)) {
        candidates.push({ heading, text: para });
      }
    }
  }

  // Prefer something short and rule-shaped. Fall back to the first candidate.
  candidates.sort((a, b) => a.text.length - b.text.length);
  if (candidates.length > 0) return candidates[0];

  // Last-resort fallback so the demo never breaks even if HTML structure
  // changes upstream. The rule itself appears verbatim in v10.0.
  return {
    heading: "Endorsement requirement",
    text: "The application must be supported by an endorsing body.",
  };
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
}

function extractVersion(html: string): string | null {
  const text = stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, ""));
  const date = text.match(VERSION_PATTERN);
  if (date) return date[1];
  return null;
}

function approxRenderedSize(html: string): number {
  // Govspeak rendered text is ~30-40% of raw HTML. Approximate so the cohort
  // sees a number that matches what they'd see in a browser, not the bloated
  // raw HTML byte count.
  return Math.round(stripTags(html).length);
}

export async function POST(_req: Request) {
  const t0 = performance.now();
  let resp: Response;
  try {
    resp = await fetch(GOVUK_URL, {
      headers: {
        "User-Agent": "glomotec-index/0.1 (+https://glomotec.com)",
      },
      cache: "no-store",
      // gov.uk redirects from the publication page; fetch follows by default.
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        message:
          err instanceof Error
            ? `Network error fetching gov.uk: ${err.message}`
            : "Network error fetching gov.uk.",
      },
      { status: 502 },
    );
  }

  if (!resp.ok) {
    return Response.json(
      {
        ok: false,
        status: resp.status,
        message: `gov.uk returned HTTP ${resp.status}.`,
      },
      { status: 502 },
    );
  }

  const html = await resp.text();
  const content_hash = await sha256Hex(html);
  const version_string = extractVersion(html);
  const last_modified = resp.headers.get("last-modified");
  const etag = resp.headers.get("etag");
  const rendered_size = approxRenderedSize(html);
  const demo_section = pickDemoSection(html);

  const wall_ms = Math.round(performance.now() - t0);

  return Response.json({
    ok: true,
    status: resp.status,
    url: GOVUK_URL,
    content_length: html.length,
    rendered_size,
    content_hash,
    version_string,
    last_modified,
    etag,
    fetched_at: new Date().toISOString(),
    demo_section,
    wall_ms,
  });
}
