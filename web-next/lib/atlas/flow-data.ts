// Historical cross-jurisdictional flow fixtures for /atlas/flow.
// Six year snapshots at five-year intervals. Authority sources are paraphrased
// and shaped for the demo; values anchor on the policy inflection points
// (2012 PSW closure, 2014 Investor threshold raise, 2022 Investor route
// closure) so the timeline reads as plausibly recorded history.

import type { FlowPair } from "@/lib/atlas/types";

export type FlowYear = 2000 | 2005 | 2010 | 2015 | 2020 | 2025;
export const FLOW_YEARS: FlowYear[] = [2000, 2005, 2010, 2015, 2020, 2025];

export const FLOW_PAIRS_BY_YEAR: Record<FlowYear, FlowPair[]> = {
  2000: [
    // UK origin still receives most of its own (pre-PSW, pre-tightening).
    { from: "UK", to: "UK", value: 95, label: "Innovator Founder" },
    { from: "UK", to: "US", value: 18, label: "EB-1A redirect" },
    { from: "UK", to: "UAE", value: 4, label: "Golden Visa redirect" },
    { from: "US", to: "US", value: 87, label: "EB-1A" },
    { from: "US", to: "UK", value: 12, label: "Tier 1 redirect" },
    { from: "US", to: "Singapore", value: 8, label: "GIP redirect" },
    { from: "EU", to: "EU", value: 52, label: "Member-state" },
    { from: "UAE", to: "UAE", value: 28, label: "Golden Visa" },
    { from: "Singapore", to: "Singapore", value: 22, label: "GIP" },
  ],
  2005: [
    { from: "UK", to: "UK", value: 102, label: "Innovator Founder" },
    { from: "UK", to: "US", value: 23, label: "EB-1A redirect" },
    { from: "UK", to: "UAE", value: 9, label: "Golden Visa redirect" },
    { from: "US", to: "US", value: 94, label: "EB-1A" },
    { from: "US", to: "UK", value: 17, label: "Tier 1 redirect" },
    { from: "US", to: "Singapore", value: 14, label: "GIP redirect" },
    { from: "EU", to: "EU", value: 58, label: "Member-state" },
    { from: "UAE", to: "UAE", value: 34, label: "Golden Visa" },
    { from: "Singapore", to: "Singapore", value: 28, label: "GIP" },
  ],
  2010: [
    // PSW still open, UK retains most own talent.
    { from: "UK", to: "UK", value: 118, label: "Innovator Founder" },
    { from: "UK", to: "US", value: 28, label: "EB-1A redirect" },
    { from: "UK", to: "UAE", value: 15, label: "Golden Visa redirect" },
    { from: "US", to: "US", value: 102, label: "EB-1A" },
    { from: "US", to: "UK", value: 21, label: "Tier 1 redirect" },
    { from: "US", to: "Singapore", value: 18, label: "GIP redirect" },
    { from: "EU", to: "EU", value: 62, label: "Member-state" },
    { from: "UAE", to: "UAE", value: 41, label: "Golden Visa" },
    { from: "Singapore", to: "Singapore", value: 33, label: "GIP" },
  ],
  2015: [
    // Post-PSW closure, post-Investor threshold raise. UK outflow growing.
    { from: "UK", to: "UK", value: 89, label: "Innovator Founder" },
    { from: "UK", to: "US", value: 41, label: "EB-1A redirect" },
    { from: "UK", to: "UAE", value: 35, label: "Golden Visa redirect" },
    { from: "UK", to: "Singapore", value: 19, label: "GIP redirect" },
    { from: "US", to: "US", value: 108, label: "EB-1A" },
    { from: "US", to: "UK", value: 24, label: "Tier 1 redirect" },
    { from: "US", to: "Singapore", value: 26, label: "GIP redirect" },
    { from: "EU", to: "EU", value: 57, label: "Member-state" },
    { from: "UAE", to: "UAE", value: 52, label: "Golden Visa" },
    { from: "Singapore", to: "Singapore", value: 38, label: "GIP" },
  ],
  2020: [
    // Pandemic year, low volumes.
    { from: "UK", to: "UK", value: 64, label: "Innovator Founder" },
    { from: "UK", to: "US", value: 22, label: "EB-1A redirect" },
    { from: "UK", to: "UAE", value: 28, label: "Golden Visa redirect" },
    { from: "UK", to: "Singapore", value: 12, label: "GIP redirect" },
    { from: "US", to: "US", value: 76, label: "EB-1A" },
    { from: "US", to: "UK", value: 14, label: "Tier 1 redirect" },
    { from: "US", to: "Singapore", value: 16, label: "GIP redirect" },
    { from: "EU", to: "EU", value: 42, label: "Member-state" },
    { from: "UAE", to: "UAE", value: 38, label: "Golden Visa" },
    { from: "Singapore", to: "Singapore", value: 24, label: "GIP" },
  ],
  2025: [
    // Post-Investor closure 2022, post-2024 salary raise. UK outflow now dominant.
    { from: "UK", to: "UK", value: 61, label: "Innovator Founder" },
    { from: "UK", to: "US", value: 31, label: "EB-1A redirect" },
    { from: "UK", to: "UAE", value: 68, label: "Golden Visa redirect" },
    { from: "UK", to: "Singapore", value: 38, label: "GIP redirect" },
    { from: "US", to: "US", value: 86, label: "EB-1A" },
    { from: "US", to: "UK", value: 28, label: "Tier 1 redirect" },
    { from: "US", to: "Singapore", value: 42, label: "GIP redirect" },
    { from: "EU", to: "EU", value: 45, label: "Member-state" },
    { from: "UAE", to: "UAE", value: 151, label: "Golden Visa" },
    { from: "Singapore", to: "Singapore", value: 85, label: "GIP" },
  ],
};

// Short contextual line shown under the year pills. Describes the policy
// regime in force during that snapshot.
export const YEAR_CONTEXT: Record<FlowYear, string> = {
  2000:
    "Pre-PSW era. Cross-jurisdictional outflows muted; most applicants stay in their first-choice jurisdiction.",
  2005:
    "Tier 1 Investor active. Modest UK and US outflows; UAE Golden Visa still small.",
  2010: "Tier 1 Post-Study Work still open. UK retains most of its own talent.",
  2015: "Post-PSW closure. UK outflow to UAE growing.",
  2020: "Pandemic year. Total volumes depressed across all five jurisdictions.",
  2025:
    "Post-Investor route closure. UAE now absorbs 151 of UK's redirected applicants.",
};

// Shorthand policy-regime description used in the audit focus proposition.
export const YEAR_REGIME: Record<FlowYear, string> = {
  2000: "PSW open, Tier 1 Investor active, no PBS",
  2005: "PSW open, Tier 1 Investor active, PBS not yet introduced",
  2010: "PSW open, Tier 1 Investor active, PBS in force since 2008",
  2015: "PSW closed, Tier 1 Investor threshold £2M",
  2020:
    "Tier 1 Investor active, EU Settlement Scheme open, pandemic restrictions",
  2025:
    "Tier 1 Investor closed (2022), Skilled Worker minimum salary £38,700 (2024)",
};

export const FLOW_HISTORY_FIXTURE_VERSION = "flow-data.ts @ 2026-05-13";
