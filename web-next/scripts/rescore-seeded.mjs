#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Re-score the three seeded operators against the current full
 * 19-criterion Innovator Founder set. The existing fixture-baked scorings
 * cover only 16 (substantive 6 + procedural 9 + suitability 1) and were
 * frozen before the suitability pillar fully landed.
 *
 * For each operator:
 *   1. Synthesise a profile narrative from their structured profile JSON.
 *   2. Append explicit suitability declarations, derived from
 *      suitability_concerns being null in the source data, so the SCORER
 *      can score the three previously-uncovered Part Suitability criteria
 *      (criminal convictions, false representations, NHS debt) on
 *      stated-clean rather than scoring on silence.
 *   3. POST to /api/score, capture the assembled AssessmentRun, write to
 *      fixtures/scorings/<slug>.json.
 *
 * Determinism: with the prompt 1 cache + temperature:0 in place, every
 * subsequent live re-score (or determinism check) returns byte-identical
 * results to whatever lands here.
 *
 * Usage:
 *   BASE_URL=https://index-advisor.vercel.app node scripts/rescore-seeded.mjs
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const fixturesDir = path.join(root, "fixtures");

const BASE_URL = (process.env.BASE_URL ?? "https://index-advisor.vercel.app").replace(
  /\/+$/,
  "",
);

const STAGE_LABEL = {
  endorsement_sought: "endorsement sought",
  endorsement_received: "endorsement received",
  filed: "filed",
  under_review: "under review",
  extension: "extension",
};

const BUSINESS_STAGE_LABEL = {
  pre_launch: "pre-launch",
  early: "early-stage",
  growth: "growth-stage",
};

function gbp(n) {
  if (n == null) return null;
  return `£${Number(n).toLocaleString("en-GB")}`;
}

/**
 * Convert a structured ClientProfile into a free-form narrative for the
 * SCORER. Mirrors what an operator would paste into /clients/new and adds
 * an explicit suitability-declarations paragraph derived from the
 * structured suitability_concerns field (null = no concerns).
 */
function narrativeForOperator(p) {
  const lines = [];
  lines.push(
    `${p.full_name} (${p.nationality}, candidate ${p.candidate_id}). Applying on the Innovator Founder route. Stage: ${STAGE_LABEL[p.stage] ?? p.stage}${p.filed_on ? `, filed on ${p.filed_on}` : ""}.`,
  );

  // Endorsement
  const e = p.endorsement;
  const endorsementLines = [];
  if (e.endorsing_body) {
    endorsementLines.push(`Endorsed by ${e.endorsing_body}`);
  }
  if (e.endorsement_path) {
    endorsementLines.push(`path: ${e.endorsement_path.replace(/_/g, " ")}`);
  }
  if (e.letter_issued_date) {
    endorsementLines.push(`endorsement letter issued ${e.letter_issued_date}`);
  }
  if (e.letter_received_application_date) {
    endorsementLines.push(
      `application submitted ${e.letter_received_application_date} (within the 3-month window from issue)`,
    );
  }
  if (e.withdrawn === false) {
    endorsementLines.push("endorsement not withdrawn");
  }
  if (e.endorsement_letter_states_innovative_viable_scalable) {
    endorsementLines.push(
      "letter states the business is innovative, viable, and scalable",
    );
  }
  if (e.endorsement_letter_describes_how_requirements_met) {
    endorsementLines.push("letter describes how each requirement is met");
  } else if (e.endorsement_letter_describes_how_requirements_met === false) {
    endorsementLines.push(
      "letter does not yet describe how each requirement is met (open question with the endorsing body)",
    );
  }
  if (endorsementLines.length > 0) {
    lines.push(endorsementLines.join("; ") + ".");
  }

  // Business
  const b = p.business;
  const businessLines = [];
  if (b.applicant_role) businessLines.push(b.applicant_role);
  businessLines.push(
    `${BUSINESS_STAGE_LABEL[b.stage] ?? b.stage ?? "stage unspecified"} business`,
  );
  if (b.founded) businessLines.push(`founded ${b.founded}`);
  if (b.applicant_active_in_day_to_day_management) {
    businessLines.push("active in day-to-day management");
  }
  if (b.investment_to_date_gbp != null) {
    businessLines.push(`${gbp(b.investment_to_date_gbp)} invested to date`);
  }
  if (b.annual_revenue_gbp != null) {
    businessLines.push(`${gbp(b.annual_revenue_gbp)} annual revenue`);
  }
  if (b.customers_count != null) {
    businessLines.push(`${b.customers_count} customers`);
  }
  if (b.ip_filings != null) {
    businessLines.push(`${b.ip_filings} IP filings`);
  }
  if (b.full_time_jobs_for_settled_workers != null) {
    businessLines.push(
      `${b.full_time_jobs_for_settled_workers} full-time jobs for settled workers`,
    );
  }
  lines.push("Business: " + businessLines.join(", ") + ".");

  // English
  const eng = p.english_language;
  const engParts = [];
  if (eng.level) engParts.push(`level ${eng.level}`);
  if (eng.evidence_type) engParts.push(eng.evidence_type);
  if (eng.score_overall != null) engParts.push(`overall score ${eng.score_overall}`);
  if (eng.test_date) engParts.push(`tested ${eng.test_date}`);
  if (engParts.length > 0) {
    lines.push("English: " + engParts.join(", ") + ".");
  }

  // Finance
  const f = p.finance;
  if (f.personal_funds_gbp != null) {
    lines.push(
      `Personal maintenance funds: ${gbp(f.personal_funds_gbp)}, ${f.held_for_at_least_28_days ? "held continuously for 28+ days" : "NOT held continuously for 28 days"}.`,
    );
  }

  // Documents and absences
  if (p.documents_in_english_or_welsh != null) {
    lines.push(
      p.documents_in_english_or_welsh
        ? "Supporting documents are in English or Welsh."
        : "Some supporting documents are not yet in English or Welsh (translations pending).",
    );
  }
  if (p.absences_from_uk_days_last_12_months != null) {
    lines.push(
      `Absences from the UK in the last 12 months: ${p.absences_from_uk_days_last_12_months} days.`,
    );
  }

  // Visa history
  if (Array.isArray(p.previous_visa_history) && p.previous_visa_history.length > 0) {
    const visa = p.previous_visa_history
      .map((v) => `${v.category} ${v.from} to ${v.to}`)
      .join("; ");
    lines.push(
      `Previous UK leave: ${visa}. No prior refusals, no overstays, no removals on file.`,
    );
  } else {
    lines.push("No previous UK leave on file. No prior refusals, no overstays, no removals.");
  }

  // Suitability declarations: explicit clean disclosure when
  // suitability_concerns is null. Required so the SCORER can score the
  // three Part Suitability criteria (criminal convictions, false
  // representations, NHS debt) on stated-clean rather than on silence.
  if (p.suitability_concerns == null) {
    lines.push(
      "Suitability declarations: no relevant criminal convictions, no pending criminal proceedings, no fit-and-proper concerns. No false representations or material non-disclosure in any previous UK immigration application. No outstanding NHS debt of any amount. Not currently on immigration bail.",
    );
  } else {
    lines.push(
      `Suitability declarations: ${p.suitability_concerns}. Otherwise no relevant criminal convictions, no false representations in prior immigration applications, no outstanding NHS debt, not currently on immigration bail.`,
    );
  }

  return lines.join("\n\n");
}

async function scoreOperator(slug, profile) {
  const url = `${BASE_URL}/api/score`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routeId: "innovator_founder",
      clientSlug: slug,
      profile,
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text();
    throw new Error(`[${slug}] HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const cacheState = res.headers.get("X-Score-Cache") ?? "unknown";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let assessment = null;
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
      const event = JSON.parse(trimmed);
      if (event.type === "complete") assessment = event.assessment;
      if (event.type === "error") errorEvent = event;
      if (event.type === "fallback_quota") fallback = event;
    }
  }
  if (fallback) {
    throw new Error(`[${slug}] /api/score returned fallback_quota — no scoring possible.`);
  }
  if (errorEvent) {
    throw new Error(`[${slug}] /api/score streamed an error: ${errorEvent.message}`);
  }
  if (!assessment) {
    throw new Error(`[${slug}] /api/score finished without a complete event.`);
  }
  return { assessment, cacheState, wallMs: Date.now() - t0 };
}

/**
 * The persisted scoring fixture follows the legacy shape:
 *   { client_slug, route_id, scored_at, total, cached, cold, results,
 *     summary, overall_pct, verdict_class, verdict_headline }
 * We strip the new aggregate fields (substantive_pct, submission_pct,
 * suitability_pct, category_summary) because lib/data.getAssessment
 * recomputes them on read via buildAssessmentRun. We also strip the
 * `criterion` snapshot from each result for the same reason.
 */
function trimResultForFixture(r) {
  return {
    criterion_id: r.criterion_id,
    probability_meets: r.probability_meets,
    confidence_level: r.confidence_level,
    supporting_evidence: r.supporting_evidence,
    missing_inputs: r.missing_inputs,
    reasoning: r.reasoning,
    scored_at: r.scored_at,
    model_version: r.model_version,
    ...(r.sanity_check_flags ? { sanity_check_flags: r.sanity_check_flags } : {}),
  };
}

function envelopeForFixture(assessment) {
  return {
    client_slug: assessment.client_slug,
    route_id: assessment.route_id,
    scored_at: assessment.scored_at,
    total: assessment.total,
    cached: assessment.cached ?? 0,
    cold: assessment.cold ?? assessment.total,
    results: assessment.results.map(trimResultForFixture),
    summary: assessment.summary,
    overall_pct: assessment.overall_pct,
    verdict_class: assessment.verdict_class,
    verdict_headline: assessment.verdict_headline,
  };
}

async function main() {
  const slugs = ["alex-mendez", "priya-iyer", "tomas-almeida"];
  console.log(`[rescore-seeded] target: ${BASE_URL}`);
  for (const slug of slugs) {
    const opPath = path.join(fixturesDir, "clients", `${slug}.json`);
    const profile = JSON.parse(await fs.readFile(opPath, "utf8"));
    const narrative = narrativeForOperator(profile);
    console.log(
      `[rescore-seeded] ${slug}: narrative ${narrative.length} chars, scoring …`,
    );
    const { assessment, cacheState, wallMs } = await scoreOperator(slug, narrative);
    const counts = {
      substantive: assessment.category_summary?.substantive?.count ?? 0,
      procedural: assessment.category_summary?.procedural?.count ?? 0,
      suitability: assessment.category_summary?.suitability?.count ?? 0,
    };
    console.log(
      `[rescore-seeded] ${slug}: cache=${cacheState}, wall=${wallMs}ms, total=${assessment.total} ` +
        `(sub=${counts.substantive}+proc=${counts.procedural}+suit=${counts.suitability}), ` +
        `overall=${assessment.overall_pct}, verdict="${assessment.verdict_headline}"`,
    );
    if (assessment.total !== 19) {
      throw new Error(
        `[${slug}] expected 19 criteria, got ${assessment.total}. Aborting before overwrite.`,
      );
    }
    const out = envelopeForFixture(assessment);
    const outPath = path.join(fixturesDir, "scorings", `${slug}.json`);
    await fs.writeFile(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`[rescore-seeded] ${slug}: wrote ${outPath}`);
  }
  console.log("[rescore-seeded] done.");
}

main().catch((err) => {
  console.error(`[rescore-seeded] aborted: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
