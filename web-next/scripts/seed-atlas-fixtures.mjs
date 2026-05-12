#!/usr/bin/env node
// Seeds fictional ATLAS company fixtures. Deterministic — same seed in,
// same JSON out. Re-run to regenerate.
//
//   node ./scripts/seed-atlas-fixtures.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "..", "fixtures", "atlas");
mkdirSync(fixturesDir, { recursive: true });

// ---- Deterministic PRNG (mulberry32) ----
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function pickWeighted(rng, items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1][0];
}
function intBetween(rng, lo, hi) {
  return Math.floor(lo + rng() * (hi - lo + 1));
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// ---- Naming pools (fictional, plausible-sounding) ----
const PREFIXES = [
  "Northwind", "Arrow", "Cardinal", "Meridian", "Lattice", "Helix", "Vector",
  "Cobalt", "Quartz", "Aster", "Falcon", "Beacon", "Solstice", "Halcyon",
  "Trident", "Sable", "Apex", "Polaris", "Argent", "Crescent", "Indigo",
  "Pinnacle", "Stratos", "Mosaic", "Echo", "Tundra", "Veridian", "Onyx",
  "Hawthorne", "Ridgeline", "Concord", "Linden", "Bramble", "Selene",
  "Aurum", "Citadel", "Lyric", "Marrow", "Quartermast", "Brevet",
  "Lighthouse", "Thornton", "Wexford", "Briar", "Cascade", "Granite",
];

const SUFFIXES_TECH = ["Labs", "Systems", "Compute", "AI", "Networks", "Cloud", "Stack", "Protocols"];
const SUFFIXES_FIN = ["Capital", "Partners", "Holdings", "Asset Management", "Wealth", "Treasury", "Markets"];
const SUFFIXES_TRADE = ["Trading", "Commodities", "Bullion", "Logistics", "Freight", "Cargo", "Shipping"];
const SUFFIXES_PRO = ["Advisory", "Consulting", "Strategy", "Group", "Services", "Solutions"];
const SUFFIXES_CRYPTO = ["Crypto Ventures", "Digital Assets", "Web3 Labs", "Chain", "Custody"];
const SUFFIXES_GAMING = ["Studios", "Interactive", "Worlds", "Play", "Games"];
const SUFFIXES_MFG = ["Industries", "Manufacturing", "Materials", "Works", "Foundry"];
const SUFFIXES_FAMILY = ["Family Office", "Trust", "Holdings"];
const SUFFIXES_GENERIC = ["Ventures", "Holdings", "Co", "& Re", "International"];

const SECTOR_TAGS = {
  commodities: { mods: ["Bullion", "Metals", "Energy", "Diamond", "Cocoa"], suf: SUFFIXES_TRADE },
  tech: { mods: ["Quantum", "Edge", "Sensor", "Data", "Cyber"], suf: SUFFIXES_TECH },
  crypto: { mods: ["Chain", "Ledger", "Node", "Validator", "Bridge"], suf: SUFFIXES_CRYPTO },
  gaming: { mods: ["Realm", "Forge", "Frame", "Mythic", "Render"], suf: SUFFIXES_GAMING },
  ai: { mods: ["Inference", "Neural", "Cognition", "Tensor", "Synapse"], suf: SUFFIXES_TECH },
  professional_services: { mods: ["Advisory", "Counsel", "Audit", "Risk", "Compliance"], suf: SUFFIXES_PRO },
  fintech: { mods: ["Pay", "Rail", "Settle", "Ledger", "Treasury"], suf: SUFFIXES_FIN },
  asset_management: { mods: ["Capital", "Yield", "Income", "Hedge", "Alpha"], suf: SUFFIXES_FIN },
  regulated_fintech: { mods: ["Reg", "Custody", "Settle", "Clearing", "Prime"], suf: SUFFIXES_FIN },
  family_office: { mods: ["Heritage", "Legacy", "Patrimony", "Trust", "Estate"], suf: SUFFIXES_FAMILY },
  logistics: { mods: ["Freight", "Routing", "Manifest", "Bonded", "Container"], suf: SUFFIXES_TRADE },
  manufacturing: { mods: ["Polymer", "Alloy", "Ceramic", "Composite", "Precision"], suf: SUFFIXES_MFG },
  trade: { mods: ["Trading", "Export", "Import", "Bonded", "Brokerage"], suf: SUFFIXES_TRADE },
  other: { mods: ["", "Group", "Holdings"], suf: SUFFIXES_GENERIC },
};

const SUB_SECTORS = {
  commodities: ["precious metals", "energy", "agricultural commodities", "industrial metals"],
  tech: ["enterprise SaaS", "cybersecurity", "IoT", "data infrastructure"],
  crypto: ["digital asset custody", "tokenisation", "validator services", "DeFi infrastructure"],
  gaming: ["mobile gaming", "studio publishing", "esports infrastructure", "AR/VR experiences"],
  ai: ["applied ML", "foundation models", "AI tooling", "voice/vision"],
  professional_services: ["legal advisory", "audit", "risk advisory", "ESG consulting"],
  fintech: ["payments", "cross-border remittance", "B2B treasury", "embedded finance"],
  asset_management: ["multi-asset", "private credit", "venture capital", "private equity"],
  regulated_fintech: ["securities settlement", "regulated custody", "prime brokerage"],
  family_office: ["single family office", "multi-family office", "estate advisory"],
  logistics: ["port logistics", "bonded warehousing", "freight forwarding", "last-mile"],
  manufacturing: ["polymers", "precision parts", "industrial materials", "specialty chemicals"],
  trade: ["import/export", "brokerage", "specialty trade", "supply chain"],
  other: ["other services"],
};

const SECTOR_LABEL = {
  commodities: "Commodities",
  tech: "Technology",
  crypto: "Crypto & digital assets",
  gaming: "Gaming & interactive",
  ai: "AI",
  professional_services: "Professional services",
  fintech: "Fintech",
  asset_management: "Asset management",
  regulated_fintech: "Regulated fintech",
  family_office: "Family office",
  logistics: "Logistics",
  manufacturing: "Manufacturing",
  trade: "Trade",
  other: "Other",
};

// Sectors that should skew up the rubric.
const SECTOR_BIAS = {
  ai: +1.2,
  fintech: +0.8,
  tech: +0.5,
  crypto: +0.2,
  regulated_fintech: +0.6,
  asset_management: +0.3,
  gaming: +0.4,
  professional_services: -0.2,
  family_office: -0.1,
  commodities: -0.7,
  logistics: -0.5,
  manufacturing: -0.3,
  trade: -0.6,
  other: -0.3,
};

const ZONE_WEIGHTS = {
  DMCC: {
    commodities: 30,
    tech: 25,
    crypto: 10,
    gaming: 8,
    professional_services: 15,
    other: 12,
  },
  DIFC: {
    fintech: 40,
    ai: 15,
    asset_management: 25,
    professional_services: 20,
  },
  ADGM: {
    asset_management: 40,
    family_office: 25,
    regulated_fintech: 20,
    other: 15,
  },
  JAFZA: {
    logistics: 35,
    manufacturing: 30,
    trade: 25,
    other: 10,
  },
};

const ZONE_META = {
  DMCC: { jurisdiction: "UAE", authority: "DMCC Authority" },
  DIFC: { jurisdiction: "UAE", authority: "DIFC Authority" },
  ADGM: { jurisdiction: "UAE", authority: "ADGM Registration Authority" },
  JAFZA: { jurisdiction: "UAE", authority: "Jebel Ali Free Zone Authority" },
};

function weightedList(weights) {
  return Object.entries(weights).map(([k, v]) => [k, v]);
}

function makeName(rng, sector) {
  const prefix = pick(rng, PREFIXES);
  const tag = SECTOR_TAGS[sector] ?? SECTOR_TAGS.other;
  const mod = pick(rng, tag.mods);
  const suf = pick(rng, tag.suf);
  return [prefix, mod, suf].filter(Boolean).join(" ").replace(/\s+/g, " ");
}

function sizeFor(rng) {
  return pickWeighted(rng, [
    ["micro", 35],
    ["small", 40],
    ["medium", 20],
    ["large", 5],
  ]);
}

function pillarFor(rng, sector) {
  const bias = SECTOR_BIAS[sector] ?? 0;
  // Wider baseline so the four bands all get populated; sector bias nudges
  // the centroid but pillar noise is large enough that any sector can
  // produce A through D samples.
  const baseline = 30 + rng() * 55;
  const innovation = clamp(Math.round(baseline + bias * 7 + (rng() - 0.5) * 28), 10, 99);
  const viability = clamp(Math.round(baseline + bias * 4 + (rng() - 0.5) * 26), 10, 99);
  const scalability = clamp(Math.round(baseline + bias * 5 + (rng() - 0.5) * 28), 10, 99);
  return { innovation, viability, scalability };
}

// Mirrors lib/atlas/rubric.ts scoreToBand so seed data is consistent with
// runtime scoring. Keep in sync.
function scoreToBand({ innovation, viability, scalability }) {
  const composite = innovation * 0.5 + viability * 0.25 + scalability * 0.25;
  if (innovation >= 80 && composite >= 78) return "A";
  if (composite >= 62) return "B";
  if (composite >= 45) return "C";
  return "D";
}

function reasoningFor(band, sector, sub) {
  const subLabel = sub;
  const sectorLabel = SECTOR_LABEL[sector] ?? sector;
  switch (band) {
    case "A":
      return `Differentiated ${subLabel} approach within ${sectorLabel.toLowerCase()}; evidence indicates a defensible technical or market position.`;
    case "B":
      return `Improved ${subLabel} offering within ${sectorLabel.toLowerCase()}; competing solutions exist but show clear gaps.`;
    case "C":
      return `Adapts existing ${sectorLabel.toLowerCase()} approaches to a ${subLabel} use case; warrants case-by-case review.`;
    case "D":
      return `Conventional ${subLabel} positioning within ${sectorLabel.toLowerCase()}; no defensible advantage surfaced in current evidence.`;
  }
}

function evidenceFor(rng, band, sector, year) {
  const out = [];
  const evidenceMix = {
    A: ["ip", "funding", "team", "press"],
    B: ["funding", "team", "filing"],
    C: ["filing", "press"],
    D: ["filing"],
  };
  const want = evidenceMix[band];
  const n = clamp(want.length - intBetween(rng, 0, 1), 1, 4);
  for (let i = 0; i < n; i++) {
    const type = want[i % want.length];
    const date = `${clamp(year + intBetween(rng, 0, 4), year, 2026)}-${String(intBetween(rng, 1, 12)).padStart(2, "0")}-${String(intBetween(rng, 1, 28)).padStart(2, "0")}`;
    out.push({
      type,
      source: evidenceSource(type, sector),
      date,
    });
  }
  return out;
}

function evidenceSource(type, sector) {
  switch (type) {
    case "ip":
      return "WIPO patent filing record";
    case "funding":
      return "PitchBook funding round disclosure";
    case "team":
      return "LinkedIn senior-team headcount snapshot";
    case "filing":
      return "free-zone registration filing";
    case "press":
      return "trade press release";
  }
  return "operator analyst note";
}

function makeCompany(rng, idx, zone, sector) {
  const sub = pick(rng, SUB_SECTORS[sector] ?? SUB_SECTORS.other);
  const pillars = pillarFor(rng, sector);
  const band = scoreToBand(pillars);
  const year = intBetween(rng, 2014, 2025);
  const size = sizeFor(rng);
  const headcountRanges = { micro: [3, 9], small: [10, 49], medium: [50, 249], large: [250, 1200] };
  const [hLo, hHi] = headcountRanges[size];
  const headcount = intBetween(rng, hLo, hHi);
  const revenue = Math.round(headcount * intBetween(rng, 80_000, 380_000));
  const id = `${zone.toLowerCase()}-${String(idx).padStart(3, "0")}`;
  return {
    id,
    name: makeName(rng, sector),
    jurisdiction: ZONE_META[zone].jurisdiction,
    zone,
    sector: SECTOR_LABEL[sector],
    subSector: sub,
    yearRegistered: year,
    size,
    headcount,
    revenue,
    grading: {
      band,
      innovation: pillars.innovation,
      viability: pillars.viability,
      scalability: pillars.scalability,
      reasoning: reasoningFor(band, sector, sub),
      evidence: evidenceFor(rng, band, sector, year),
    },
    dataSource: {
      authority: ZONE_META[zone].authority,
      confidence: pickWeighted(rng, [
        ["high", 55],
        ["medium", 35],
        ["low", 10],
      ]),
      lastUpdated: `2026-0${intBetween(rng, 1, 4)}-${String(intBetween(rng, 1, 28)).padStart(2, "0")}`,
    },
  };
}

function generateZone(zone, count, seed) {
  const rng = makeRng(seed);
  const weights = weightedList(ZONE_WEIGHTS[zone]);
  const companies = [];
  for (let i = 1; i <= count; i++) {
    const sector = pickWeighted(rng, weights);
    companies.push(makeCompany(rng, i, zone, sector));
  }
  return companies;
}

// ---- UK Innovator Founder (separate seed/structure) ----
const UK_SECTORS = ["ai", "fintech", "tech", "professional_services", "manufacturing", "other"];
const UK_SECTOR_WEIGHTS = [
  ["ai", 22],
  ["fintech", 22],
  ["tech", 22],
  ["professional_services", 14],
  ["manufacturing", 10],
  ["other", 10],
];
const UK_BODIES = [
  "Envestors Limited",
  "Sirius Group",
  "Innovator International",
  "UK Endorsing Bodies Ltd",
];

function generateUk(seed) {
  const rng = makeRng(seed);
  const companies = [];
  for (let i = 1; i <= 60; i++) {
    const sector = pickWeighted(rng, UK_SECTOR_WEIGHTS);
    const sub = pick(rng, SUB_SECTORS[sector] ?? SUB_SECTORS.other);
    const pillars = pillarFor(rng, sector);
    const band = scoreToBand(pillars);
    const year = intBetween(rng, 2020, 2025);
    const size = pickWeighted(rng, [["micro", 70], ["small", 25], ["medium", 5]]);
    const headcountRanges = { micro: [1, 5], small: [6, 20], medium: [21, 60] };
    const [hLo, hHi] = headcountRanges[size];
    const headcount = intBetween(rng, hLo, hHi);
    const id = `uk-inn-${String(i).padStart(3, "0")}`;
    companies.push({
      id,
      name: makeName(rng, sector),
      jurisdiction: "UK",
      zone: null,
      sector: SECTOR_LABEL[sector],
      subSector: sub,
      yearRegistered: year,
      size,
      headcount,
      grading: {
        band,
        innovation: pillars.innovation,
        viability: pillars.viability,
        scalability: pillars.scalability,
        reasoning: reasoningFor(band, sector, sub),
        evidence: evidenceFor(rng, band, sector, year),
      },
      dataSource: {
        authority: pick(rng, UK_BODIES),
        confidence: pickWeighted(rng, [["high", 45], ["medium", 40], ["low", 15]]),
        lastUpdated: `2026-0${intBetween(rng, 1, 4)}-${String(intBetween(rng, 1, 28)).padStart(2, "0")}`,
      },
    });
  }
  return companies;
}

// ---- Emit ----
const datasets = [
  { name: "dmcc", data: generateZone("DMCC", 80, 0xa11ce) },
  { name: "difc", data: generateZone("DIFC", 80, 0xd1fcd) },
  { name: "adgm", data: generateZone("ADGM", 60, 0xadcbd) },
  { name: "jafza", data: generateZone("JAFZA", 60, 0x1afaa) },
  { name: "uk-innovator", data: generateUk(0xc0de) },
];

for (const ds of datasets) {
  const file = join(fixturesDir, `${ds.name}.json`);
  writeFileSync(file, JSON.stringify(ds.data, null, 2) + "\n");
  const counts = ds.data.reduce(
    (acc, c) => ({ ...acc, [c.grading.band]: (acc[c.grading.band] ?? 0) + 1 }),
    {},
  );
  console.log(
    `${ds.name}: ${ds.data.length} companies · bands A=${counts.A ?? 0} B=${counts.B ?? 0} C=${counts.C ?? 0} D=${counts.D ?? 0}`,
  );
}
