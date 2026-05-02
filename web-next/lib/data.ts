import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type {
  AssessmentRun,
  ChangefeedEntry,
  ClientProfile,
  Criterion,
  ModuleStatus,
  Route,
  ScoringResult,
} from "@/lib/types";
import { buildAssessmentRun } from "@/lib/scoring";

const root = path.join(process.cwd(), "fixtures");

async function readJson<T>(rel: string): Promise<T> {
  const buf = await fs.readFile(path.join(root, rel), "utf8");
  return JSON.parse(buf) as T;
}

let _routes: Route[] | null = null;
export async function getRoutes(): Promise<Route[]> {
  if (!_routes) _routes = await readJson<Route[]>("routes.json");
  return _routes;
}

export async function getRoute(id: string): Promise<Route | null> {
  const routes = await getRoutes();
  return routes.find((r) => r.id === id) ?? null;
}

const _criteriaCache = new Map<string, Criterion[]>();
export async function getCriteria(routeId: string): Promise<Criterion[]> {
  if (_criteriaCache.has(routeId)) return _criteriaCache.get(routeId)!;
  if (routeId !== "innovator_founder") return [];
  const items = await readJson<Criterion[]>("criteria_innovator_founder.json");
  _criteriaCache.set(routeId, items);
  return items;
}

let _clients: ClientProfile[] | null = null;
export async function getClients(): Promise<ClientProfile[]> {
  if (_clients) return _clients;
  const dir = path.join(root, "clients");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const all = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), "utf8")) as ClientProfile),
  );
  _clients = all;
  return all;
}

export async function getClient(slug: string): Promise<ClientProfile | null> {
  const clients = await getClients();
  return clients.find((c) => c.slug === slug) ?? null;
}

export async function getAssessment(slug: string): Promise<AssessmentRun | null> {
  try {
    const raw = await readJson<AssessmentRun>(path.join("scorings", `${slug}.json`));
    const client = await getClient(slug);
    if (!client) return raw;
    const criteria = await getCriteria(client.intended_route);
    const lookup = new Map(criteria.map((c) => [c.id, c]));
    const enriched: ScoringResult[] = raw.results.map((r) => {
      const c = lookup.get(r.criterion_id);
      if (!c) return r;
      return {
        ...r,
        criterion: {
          id: c.id,
          decision_stage: c.decision_stage,
          modality: c.modality,
          assessment_mechanism: c.assessment_mechanism,
          category: c.category,
          predicate: c.predicate,
          source: c.source,
          burden_allocation: c.burden_allocation,
          predicate_statement: c.predicate.statement,
          section_heading:
            c.source.section_heading ??
            c.source.anchor?.section_heading ??
            c.source.anchor?.verbatim_text,
          verbatim_text: c.source.anchor?.verbatim_text,
        },
      };
    });
    // Recompute the verdict envelope on top of the fixture file. This means
    // the seeded clients pick up the two-score model + new headline mapping
    // without re-generating the scoring JSON files.
    return buildAssessmentRun({
      client_slug: raw.client_slug,
      route_id: raw.route_id,
      results: enriched,
      scored_at: raw.scored_at,
    });
  } catch {
    return null;
  }
}

let _changefeed: ChangefeedEntry[] | null = null;
export async function getChangefeed(): Promise<ChangefeedEntry[]> {
  if (_changefeed) return _changefeed;
  try {
    _changefeed = await readJson<ChangefeedEntry[]>("changefeed.json");
  } catch {
    _changefeed = [];
  }
  return _changefeed;
}

export async function getRecentChanges(limit = 5): Promise<ChangefeedEntry[]> {
  const all = await getChangefeed();
  return [...all]
    .sort((a, b) => +new Date(b.observed_at) - +new Date(a.observed_at))
    .slice(0, limit);
}

export function getModuleStatus(): ModuleStatus[] {
  const now = new Date();
  const minus = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  return [
    {
      id: "crawler",
      name: "Crawler",
      status: "live",
      last_run: minus(7),
      detail: "Polling 4 caseworker guidance pages on a 7-day cadence.",
    },
    {
      id: "extractor",
      name: "Extractor",
      status: "live",
      last_run: minus(38),
      detail: "Parsing predicates, sources and burden allocations from new revisions.",
    },
    {
      id: "scorer",
      name: "Scorer",
      status: "live",
      last_run: minus(2),
      detail: "Cached assessments for 3 active clients · last cold run 2m ago.",
    },
    {
      id: "changefeed",
      name: "Change feed",
      status: "live",
      last_run: minus(14),
      detail: "Diffing v10.0 (27 Feb 2026) against v9.4 (15 Nov 2025).",
    },
    {
      id: "evaluator",
      name: "Evaluator",
      status: "idle",
      last_run: minus(1440),
      detail: "Quarterly LLM-vs-advisor concordance run scheduled for 7 May.",
    },
  ];
}

export function summariseClient(c: ClientProfile): {
  primary: string;
  secondary: string;
  badge: string;
} {
  const stageLabel: Record<ClientProfile["stage"], string> = {
    endorsement_sought: "Endorsement sought",
    endorsement_received: "Endorsement received",
    filed: "Filed",
    under_review: "Under review",
    extension: "Extension",
  };
  return {
    primary: c.full_name,
    secondary: `${c.nationality} · ${c.business.applicant_role ?? "Founder"}`,
    badge: stageLabel[c.stage] ?? c.stage,
  };
}
