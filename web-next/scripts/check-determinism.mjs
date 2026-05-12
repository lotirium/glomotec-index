#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Determinism harness for the SCORER.
 *
 * POSTs a fixed profile to /api/score twice and asserts the assembled
 * AssessmentRun is byte-identical between runs (JSON.stringify equality).
 *
 * Usage:
 *   BASE_URL=https://index-advisor.vercel.app node scripts/check-determinism.mjs
 *   BASE_URL=http://localhost:3000 node scripts/check-determinism.mjs
 *
 * Fails (exit 1) on mismatch and prints a diff. Exits 0 on match.
 *
 * R_NONDETERMINISTIC=1 must NOT be set on the target deployment, or the
 * cache layer is bypassed and this check will reliably fail.
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const ROUTE_ID = "innovator_founder";
const CLIENT_SLUG = "draft-determinism-check";

// Fixed profile: realistic but synthetic. Same string both runs.
const FIXTURE_PROFILE = `Sofia Kowalski, Polish national, age 31. Founder & CEO of GlideStack, an early-stage SaaS company building exporter-compliance tooling for SME freight forwarders.

Education: MEng Industrial Engineering, Politechnika Warszawska (2018), distinction. Five years at Allegro on the marketplace logistics team before founding GlideStack in late 2024.

Business stage: pre-revenue, two pilot freight forwarders signed under LOI. Incorporated as a UK Ltd in November 2025. £180k raised: £40k personal, £90k SEIS angel round (two angels), £50k SEIS-eligible accelerator (Carbon13 Q1 2026 cohort).

Endorsement: in active conversation with Innovator International. Submitted contact-point dossier 12 February 2026; expect endorsement letter within four weeks. No letter issued yet.

Visa status: currently on a Skilled Worker visa as a senior product engineer at a London logistics scale-up; plan to switch into Innovator Founder once endorsement letter is in hand.

English: undergraduate degree taught in English (academic English certified). Documents in English. No translations required.

Funds: £18,400 personal funds in HSBC UK current account, held continuously since October 2025 (5+ months as of application).

Suitability: no UK refusals, no overstays, no criminal record, no NHS debt, no immigration bail, no false-representation findings on file.`;

async function scoreOnce(label) {
  const url = `${BASE_URL}/api/score`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routeId: ROUTE_ID,
      clientSlug: CLIENT_SLUG,
      profile: FIXTURE_PROFILE,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${label}] HTTP ${res.status} from ${url}: ${text.slice(0, 400)}`);
  }
  if (!res.body) {
    throw new Error(`[${label}] empty response body from ${url}`);
  }

  const cacheState = res.headers.get("X-Score-Cache") ?? "unknown";

  // NDJSON stream parser.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let assessment = null;
  let started = null;
  let errorEvent = null;
  let fallback = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event;
      try {
        event = JSON.parse(trimmed);
      } catch {
        throw new Error(`[${label}] malformed NDJSON line: ${trimmed.slice(0, 200)}`);
      }
      if (event.type === "started") started = event;
      if (event.type === "complete") assessment = event.assessment;
      if (event.type === "error") errorEvent = event;
      if (event.type === "fallback_quota") fallback = event;
    }
  }

  if (fallback) {
    throw new Error(
      `[${label}] /api/score returned fallback_quota: "${fallback.headline ?? "no headline"}". ` +
        "Ensure ANTHROPIC_API_KEY is funded on the target deployment.",
    );
  }
  if (errorEvent) {
    throw new Error(`[${label}] /api/score streamed an error event: ${errorEvent.message}`);
  }
  if (!assessment) {
    throw new Error(`[${label}] /api/score finished without a complete event.`);
  }

  return {
    assessment,
    started,
    cacheState,
    wallMs: Date.now() - t0,
  };
}

function diffSummary(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const lines = [];
  for (const k of keys) {
    const av = JSON.stringify(a[k]);
    const bv = JSON.stringify(b[k]);
    if (av !== bv) {
      lines.push(`  ${k}:`);
      lines.push(`    A → ${truncate(av, 200)}`);
      lines.push(`    B → ${truncate(bv, 200)}`);
    }
  }
  return lines.join("\n");
}

function truncate(s, n) {
  if (typeof s !== "string") return String(s);
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function main() {
  console.log(`[determinism] target: ${BASE_URL}`);
  console.log(`[determinism] profile: ${FIXTURE_PROFILE.length} chars`);
  console.log(`[determinism] run A …`);
  const a = await scoreOnce("A");
  console.log(
    `[determinism] run A done: cache=${a.cacheState}, wall=${a.wallMs}ms, ` +
      `verdict=${a.assessment.verdict_headline}, ` +
      `sub=${a.assessment.substantive_pct} sub=${a.assessment.submission_pct} suit=${a.assessment.suitability_pct}`,
  );
  console.log(`[determinism] run B …`);
  const b = await scoreOnce("B");
  console.log(
    `[determinism] run B done: cache=${b.cacheState}, wall=${b.wallMs}ms, ` +
      `verdict=${b.assessment.verdict_headline}, ` +
      `sub=${b.assessment.substantive_pct} sub=${b.assessment.submission_pct} suit=${b.assessment.suitability_pct}`,
  );

  const aJson = JSON.stringify(a.assessment);
  const bJson = JSON.stringify(b.assessment);

  if (aJson === bJson) {
    console.log(`[determinism] PASS: assessment is byte-identical (${aJson.length} chars)`);
    if (b.cacheState !== "hit") {
      console.warn(
        "[determinism] WARNING: run B reported X-Score-Cache=" +
          b.cacheState +
          ". Match was achieved without the cache, which means Anthropic happened to be deterministic this time. The cache should always pin replays — investigate whether R_NONDETERMINISTIC is set or the function instance was cold.",
      );
    }
    process.exit(0);
  }

  console.error("[determinism] FAIL: assessments diverge between runs A and B.");
  console.error(`  run A cache=${a.cacheState}`);
  console.error(`  run B cache=${b.cacheState}`);
  console.error("  diff:");
  console.error(diffSummary(a.assessment, b.assessment));
  process.exit(1);
}

main().catch((err) => {
  console.error(`[determinism] aborted: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
