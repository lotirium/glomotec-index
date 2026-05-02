#!/usr/bin/env node
// Mirror glomotec_index/shared/ into web-next/shared/ so Vercel sees the
// canonical scorer prompt + tool schema files. The Python pipeline reads
// directly from the canonical location at glomotec_index/shared/; this
// script is web-next-only.
//
// Vercel build context: when deploying via `vercel --prod` from web-next/,
// the canonical /shared/ may not be present (only web-next/ uploads). In
// that case the existing web-next/shared/ snapshot is authoritative; this
// script no-ops with a friendly message so the build proceeds. Locally,
// prebuild ensures the snapshot matches the canonical source before deploy.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webNextRoot = path.resolve(here, "..");
const repoRoot = path.resolve(webNextRoot, "..");
const src = path.join(repoRoot, "shared");
const dst = path.join(webNextRoot, "shared");

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

if (!(await exists(src))) {
  if (await exists(dst)) {
    console.log(`[sync-shared] canonical /shared/ not present; using existing web-next/shared snapshot.`);
    process.exit(0);
  }
  console.error(`[sync-shared] missing canonical dir: ${src} (and no snapshot at web-next/shared/)`);
  process.exit(1);
}

await fs.rm(dst, { recursive: true, force: true });
await fs.mkdir(dst, { recursive: true });

const entries = await fs.readdir(src, { withFileTypes: true });
let copied = 0;
for (const entry of entries) {
  if (!entry.isFile()) continue;
  await fs.copyFile(path.join(src, entry.name), path.join(dst, entry.name));
  copied += 1;
}
console.log(`[sync-shared] mirrored ${copied} file(s) ${path.relative(repoRoot, src)} → web-next/shared/`);
