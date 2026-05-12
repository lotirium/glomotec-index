import { RUBRIC_VERSION } from "@/lib/atlas/rubric";
import type {
  AuditEvidence,
  AuditGrade,
} from "@/components/atlas/audit-context";
import type { ZoneOrUk, ZoneSummary } from "@/lib/atlas/data";
import type { AtlasCompany } from "@/lib/atlas/types";

export function fixtureRef(zone: ZoneOrUk): string {
  if (zone === "UK") return "fixtures/atlas/uk-innovator.json";
  return `fixtures/atlas/${zone.toLowerCase()}.json`;
}

export function zoneEvidence(zone: ZoneSummary, confidence: AuditEvidence["confidence"] = "high"): AuditEvidence {
  return {
    authority: zone.authority,
    dataset: zone.dataset,
    lastUpdated: zone.lastUpdated,
    confidence,
    fixtureRef: fixtureRef(zone.zone),
  };
}

export function companyEvidence(company: AtlasCompany): AuditEvidence {
  return {
    authority: company.dataSource.authority,
    dataset: company.zone
      ? `${company.zone} member entity register (sample)`
      : "UK Innovator Founder sample register",
    lastUpdated: company.dataSource.lastUpdated,
    confidence: company.dataSource.confidence,
    fixtureRef: company.zone ? fixtureRef(company.zone) : "fixtures/atlas/uk-innovator.json",
  };
}

export function aggregateEvidence(
  zones: ZoneSummary[],
  lastRefresh: string,
): AuditEvidence {
  return {
    authority: "Aggregate of four UAE free zone registers (sample)",
    dataset: "DMCC, DIFC, ADGM, JAFZA registers",
    lastUpdated: lastRefresh,
    confidence: "high",
    fixtureRef: zones.map((z) => fixtureRef(z.zone)).join(", "),
  };
}

export function rubricGrade(method?: string): AuditGrade {
  return {
    rubricVersion: RUBRIC_VERSION,
    rubricHref: "/atlas/rubric",
    method,
  };
}

export const RUBRIC_METHOD_LINE =
  "Composite = 0.5 × Innovation + 0.25 × Viability + 0.25 × Scalability. Band A requires Innovation ≥ 80 and composite ≥ 78.";
