// One-shot fixture augmentation: add an `origin_country` ISO-3166 alpha-2
// field to every entity across the four UAE free-zone fixtures.
//
// Deterministic (seeded mulberry32) so re-running produces the same
// distribution and we don't churn the fixtures on each run. Targets the
// weights from the Visual 01 build spec.
//
// Run ONCE:  node web-next/scripts/augment-origin-data.mjs
// Do NOT wire into the build pipeline.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "..", "fixtures", "atlas");
const ZONE_FILES = ["dmcc.json", "difc.json", "adgm.json", "jafza.json"];

// Per-spec weighted distribution. Headline ten, plus thin-tail residuals.
// Sum is 100. Values are percentage shares of total entity population.
const WEIGHTS = [
  ["IN", 22], // India
  ["GB", 18], // United Kingdom
  ["US", 14], // United States
  ["CN", 9],  // China
  ["FR", 6],  // France
  ["DE", 5],  // Germany
  ["PK", 5],  // Pakistan
  ["EG", 4],  // Egypt
  ["LB", 3],  // Lebanon
  ["JO", 3],  // Jordan
  // Thin tail (residual 11%):
  ["SG", 2],  // Singapore
  ["CH", 2],  // Switzerland
  ["RU", 2],  // Russia
  ["SA", 1],  // Saudi Arabia
  ["TR", 1],  // Turkey
  ["ZA", 1],  // South Africa
  ["AU", 1],  // Australia
  ["CA", 1],  // Canada
];

const total = WEIGHTS.reduce((s, [, w]) => s + w, 0);
if (total !== 100) {
  console.error(`Weights sum to ${total}, expected 100`);
  process.exit(1);
}

// Cumulative thresholds for sampling: [[code, cumulative], ...]
let acc = 0;
const cum = WEIGHTS.map(([code, w]) => {
  acc += w;
  return [code, acc];
});

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleCountry(rng) {
  const r = rng() * 100;
  for (const [code, threshold] of cum) {
    if (r < threshold) return code;
  }
  return cum[cum.length - 1][0];
}

const rng = mulberry32(20260512); // today's date, fixed forever

let mutated = 0;
let skipped = 0;
for (const file of ZONE_FILES) {
  const p = path.join(fixturesDir, file);
  const raw = await fs.readFile(p, "utf8");
  const data = JSON.parse(raw);
  // Sort by id so the assignment is order-stable across re-runs even if
  // someone re-ordered the fixture by hand.
  const sorted = [...data].sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map();
  for (const entity of sorted) {
    if (entity.origin_country) {
      skipped += 1;
      byId.set(entity.id, entity);
      continue;
    }
    entity.origin_country = sampleCountry(rng);
    mutated += 1;
    byId.set(entity.id, entity);
  }
  // Preserve the original on-disk order.
  const out = data.map((e) => byId.get(e.id));
  await fs.writeFile(p, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`  ${file}: ${data.length} entities`);
}

console.log(`\nDone. Mutated ${mutated} entities. Skipped ${skipped} that already had origin_country.`);
