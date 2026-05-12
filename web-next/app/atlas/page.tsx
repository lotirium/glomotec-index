import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ATLAS · Visual intelligence showcase",
  description:
    "A common standard for global mobility, visualised. Six rubrics, five regions, one engine. Cross-jurisdictional scoring, settlement-pathway forecasting, and policy simulation.",
};

const TILES = [
  {
    id: "01",
    href: "/atlas/uae/origin-map",
    badge: "Geographic",
    time: "~45s read",
    label: "Visual 01 · The brain drain question",
    title: "Where UAE Band A talent comes from.",
    desc: "A world map showing the origin country of every Band A entity in the UAE free-zone sample. Flow lines from origin to UAE. The brain drain story made visible in 3 seconds.",
    takeaway: "India, UK, US account for 54% of UAE Band A entities",
    decor: "origin" as const,
    aspectClass: "aspect-[16/9]",
  },
  {
    id: "02",
    href: "/atlas/simulator",
    badge: "Interactive",
    time: "2-3 min",
    label: "Visual 02 · The policy lever",
    title: "What happens if you change the rules?",
    desc: "Three sliders for innovation weight, Band A threshold, and a talent localisation floor. Live band distribution today, plus a three-year forecast under the same conditions.",
    takeaway: "Pull a slider and see the pipeline reshape, today and in 2029",
    decor: "simulator" as const,
    aspectClass: "aspect-[16/9]",
  },
  {
    id: "03",
    href: "/atlas/uae",
    badge: "Pattern",
    time: "~60s read",
    label: "Visual 03 · The concentration map",
    title: "Where the strength sits.",
    desc: "UAE free zones versus sectors in a four-by-eight grid. Cell colour shows Band A concentration. JAFZA's near-empty row is the case for adding the Economic Substance rubric.",
    takeaway:
      "Fintech in DIFC, AI in DMCC, Family Office in ADGM are the deepest pockets",
    decor: "heatmap" as const,
    aspectClass: "aspect-[16/9]",
  },
  {
    id: "04",
    href: "/atlas/flow",
    badge: "Sankey",
    time: "~90s read",
    label: "Visual 04 · The portability story",
    title: "When one country says no, where do they go?",
    desc: "400 applicants rejected or unrenewed in their first-choice jurisdiction, traced to where they ended up. 68 UK Innovator Founder rejections found UAE Golden Visa.",
    takeaway: "UAE absorbs the most spillover at 151 second-choice approvals",
    decor: "sankey" as const,
    aspectClass: "aspect-[16/9]",
  },
  {
    id: "05",
    href: "/atlas/company/dmcc-047",
    badge: "Entity dashboard",
    time: "3-5 min",
    label: "Visual 05 · The killer feature",
    title: "One entity, every settlement pathway, forecast forward.",
    desc: "A real entity walked through six-rubric scoring, four jurisdictional settlement probabilities, and a three-year score trajectory. Halcyon Sensor Compute (DMCC-047, Band A) has a credible footprint across UK Innovator Founder ILR, US EB-1A, Singapore GIP, and UAE Golden Visa renewal. No other system shows this view.",
    takeaway:
      "UK ILR at 78% probability by month 36, UAE Golden Visa renewal at 86%",
    decor: "entity" as const,
    aspectClass: "aspect-[21/7]",
    spanFull: true,
  },
];

type TileDecor = (typeof TILES)[number]["decor"];

export default function AtlasShowcasePage() {
  return (
    <main className="container py-12 md:py-16">
      {/* HERO */}
      <section className="mb-12 max-w-[58rem] md:mb-16">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
          The glomotec Mobility Code · gMC v1.0
        </p>
        <h1 className="mt-4 text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-accent md:text-[3.5rem]">
          A common standard for global mobility,{" "}
          <span className="text-cyan">visualised</span>.
        </h1>
        <p className="mt-5 max-w-[45rem] text-base leading-relaxed text-ink-soft md:text-lg">
          Six rubrics, five regions, one engine. Cross-jurisdictional scoring,
          settlement-pathway forecasting, and policy simulation. Built to be
          understood in five minutes by anyone with a policy decision to make.
        </p>

        {/* HERO STATS CARD */}
        <div className="mt-8 grid grid-cols-2 gap-4 rounded-md border border-glacier bg-surface p-5 md:mt-10 md:grid-cols-4 md:gap-6 md:p-7">
          <Stat n="6 × 5" highlightChar="×" label="Rubrics × Regions in the matrix" />
          <Stat n="280" label="UAE free-zone entities indexed" />
          <Stat n="5" label="Settlement pathways forecast" />
          <Stat n="36mo" label="UK ILR projection horizon" />
        </div>
      </section>

      {/* FIVE-MINUTE RULE CARD */}
      <section className="mb-14">
        <div className="grid grid-cols-[auto_1fr] items-center gap-6 rounded-md border border-glacier border-l-4 border-l-cyan bg-surface p-6 md:gap-7 md:p-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-glacier/60 md:h-16 md:w-16">
            <span className="text-xl font-extrabold tabular text-accent md:text-[1.6rem]">
              5&apos;
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft md:text-[1.05rem]">
            Every visual in this showcase passes the{" "}
            <strong className="font-bold text-ink">five-minute rule</strong>. A
            non-technical decision-maker should be able to see it, understand
            it, and feel the outcome in under five minutes. If a screen needs
            longer to absorb, it does not belong in the demo.
          </p>
        </div>
      </section>

      {/* SECTION 01 */}
      <SectionHeader
        n="01"
        title="The five visuals"
        sub="Each visual answers one question a policy team or sovereign buyer would naturally ask. Each one stands alone. Together they walk a decision-maker from where talent is, to where it should be, to what happens if you change the rules."
      />

      {/* TILE GRID */}
      <div className="mb-16 grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-2">
        {TILES.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "group flex flex-col overflow-hidden rounded-md border border-glacier bg-surface transition-colors hover:border-frost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              t.spanFull && "lg:col-span-2",
            )}
          >
            {/* Preview area */}
            <div
              className={cn(
                "relative overflow-hidden",
                t.aspectClass,
              )}
            >
              <TileDecor variant={t.decor} />
              <span className="absolute left-3.5 top-3.5 rounded-sm bg-accent-deep/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-surface backdrop-blur">
                {t.badge}
              </span>
              <span className="absolute right-3.5 top-3.5 rounded-sm bg-cyan/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-surface backdrop-blur">
                {t.time}
              </span>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-3 p-5 md:p-7">
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
                {t.label}
              </p>
              <h3 className="text-lg font-bold leading-snug tracking-tight text-accent md:text-[1.375rem]">
                {t.title}
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-ink-soft">
                {t.desc}
              </p>
              <p className="mt-1 flex items-center gap-2 border-t border-glacier pt-4 text-[13px] text-ink-muted">
                <span aria-hidden className="font-bold text-cyan">
                  →
                </span>
                <span>{t.takeaway}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* SECTION 02 */}
      <SectionHeader
        n="02"
        title="What ties them together"
        sub="All five visuals are built on the same underlying engine. Each one is a different lens on the same scoring fabric. The matrix is configurable per jurisdiction, the engine is jurisdiction-agnostic, the visuals are how the framework gets seen."
      />

      {/* FOOTER */}
      <section className="relative overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-6 py-10 text-surface md:px-14 md:py-12">
        <img
          src="/brand/atlas-primary-white.svg"
          alt="ATLAS"
          aria-hidden="true"
          width={91}
          height={40}
          className="pointer-events-none absolute right-6 top-6 h-8 w-auto opacity-90 md:right-14 md:top-10 md:h-10"
        />
        <h2 className="max-w-[80%] text-2xl font-extrabold leading-[1.15] tracking-tight md:max-w-none md:text-[2rem]">
          The matrix is the <span className="text-cyan">standard</span>. The
          engine is the <span className="text-cyan">moat</span>.
        </h2>
        <p className="mt-4 max-w-[50rem] text-[15px] leading-relaxed text-surface/85 md:text-[17px]">
          gMC v1.0 is glomotec&apos;s foundational draft of a unified scoring
          framework for cross-jurisdictional mobility. The{" "}
          <strong className="font-bold text-surface">
            published framework is open
          </strong>
          , on the pattern of ICC Incoterms 2020 and UCP 600. The{" "}
          <strong className="font-bold text-surface">
            implementation is licensable
          </strong>{" "}
          through ENGINE, running gMC at scale against real authority data
          feeds (UK Home Office, USCIS, UAE ICP, Saudi MHRSD, Singapore EDB, EU
          Member State authorities). The visuals in this showcase are the
          surface; INDEX is the data layer; ENGINE is the infrastructure
          beneath both.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-surface/15 pt-8 md:grid-cols-3 md:gap-8">
          <FooterCol
            label="For policy teams"
            body="Test policy levers before you pull them. See which sectors are gaining, which are leaking, and which need new scoring lenses to be fairly assessed."
          />
          <FooterCol
            label="For sovereign funds and family offices"
            body="Inbound talent and entity due diligence with a portable signal across jurisdictions. Same scoring language whether the candidate is UK, US, GCC, or ASEAN."
          />
          <FooterCol
            label="For multinational HR"
            body="Deploy talent with a common framework. Model jurisdictional contribution and risk consistently across your entire global footprint."
          />
        </div>
      </section>
    </main>
  );
}

function Stat({
  n,
  highlightChar,
  label,
}: {
  n: string;
  highlightChar?: string;
  label: string;
}) {
  let rendered: React.ReactNode = n;
  if (highlightChar && n.includes(highlightChar)) {
    const parts = n.split(highlightChar);
    rendered = (
      <>
        {parts[0]}
        <span className="text-cyan">{highlightChar}</span>
        {parts[1]}
      </>
    );
  }
  return (
    <div>
      <p className="text-2xl font-extrabold leading-none tabular tracking-tight text-accent md:text-[2.25rem]">
        {rendered}
      </p>
      <p className="mt-1.5 text-[13px] font-medium text-ink-soft">{label}</p>
    </div>
  );
}

function SectionHeader({
  n,
  title,
  sub,
}: {
  n: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-baseline gap-4">
        <span className="inline-flex rounded-sm bg-cyan/10 px-2.5 py-1 font-mono text-2xs font-extrabold uppercase tracking-[0.18em] text-cyan">
          {n}
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-accent md:text-[1.75rem]">
          {title}
        </h2>
      </div>
      <p className="mt-3 max-w-[45rem] text-[15px] text-ink-muted">{sub}</p>
    </div>
  );
}

function FooterCol({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-2xs font-bold uppercase tracking-[0.18em] text-cyan">
        {label}
      </p>
      <p className="mt-2.5 text-sm leading-relaxed text-surface/80">{body}</p>
    </div>
  );
}

function TileDecor({ variant }: { variant: TileDecor }) {
  switch (variant) {
    case "origin":
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-accent to-cyan">
          <svg
            viewBox="0 0 320 180"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full opacity-90"
            aria-hidden
          >
            {/* Convergence target (UAE) */}
            <circle cx="220" cy="100" r="7" fill="#00A2E9" stroke="white" strokeWidth="2" />
            {/* Origin dots */}
            {[
              [60, 70],
              [110, 50],
              [150, 90],
              [60, 130],
              [90, 110],
              [40, 95],
              [260, 50],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3.5} fill="white" opacity={0.85} />
            ))}
            {/* Flow lines */}
            {[
              [60, 70],
              [110, 50],
              [150, 90],
              [60, 130],
              [90, 110],
              [40, 95],
              [260, 50],
            ].map(([x, y], i) => (
              <path
                key={`f${i}`}
                d={`M ${x} ${y} Q ${(x + 220) / 2} ${Math.min(y, 100) - 12}, 220 100`}
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                fill="none"
                strokeDasharray="3 4"
              />
            ))}
          </svg>
        </div>
      );
    case "simulator":
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-deep via-accent to-cyan/70">
          <svg
            viewBox="0 0 320 180"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {[40, 80, 120].map((y, i) => (
              <g key={i}>
                <line
                  x1="40"
                  x2="280"
                  y1={y}
                  y2={y}
                  stroke="white"
                  strokeOpacity="0.4"
                  strokeWidth="2"
                />
                <circle
                  cx={[140, 200, 90][i]}
                  cy={y}
                  r="6"
                  fill="#00A2E9"
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
            {/* Tiny forecast spark */}
            <polyline
              points="40,155 80,150 120,140 160,135 200,128 240,120 280,118"
              fill="none"
              stroke="white"
              strokeOpacity="0.7"
              strokeWidth="2"
            />
            <polyline
              points="40,160 80,158 120,156 160,154 200,150 240,148 280,145"
              fill="none"
              stroke="white"
              strokeOpacity="0.35"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>
        </div>
      );
    case "heatmap":
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-glacier to-cyan/60">
          <svg
            viewBox="0 0 320 180"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {Array.from({ length: 4 }).map((_, row) =>
              Array.from({ length: 8 }).map((__, col) => {
                const intensity = (row * 8 + col) / 31;
                const opacity = 0.15 + intensity * 0.75;
                return (
                  <rect
                    key={`${row}-${col}`}
                    x={20 + col * 35}
                    y={30 + row * 32}
                    width={30}
                    height={28}
                    rx={3}
                    fill="#2B3E8F"
                    fillOpacity={opacity}
                  />
                );
              }),
            )}
          </svg>
        </div>
      );
    case "sankey":
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-deep via-accent to-[#7C3AED]">
          <svg
            viewBox="0 0 320 180"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {/* 5 left + 5 right nodes */}
            {[35, 60, 85, 110, 135].map((y, i) => (
              <rect
                key={`l${i}`}
                x="40"
                y={y}
                width={5}
                height={18}
                rx={2}
                fill="white"
                fillOpacity="0.9"
              />
            ))}
            {[35, 60, 85, 110, 135].map((y, i) => (
              <rect
                key={`r${i}`}
                x="275"
                y={y}
                width={5}
                height={18}
                rx={2}
                fill="white"
                fillOpacity="0.9"
              />
            ))}
            {/* Sample ribbons */}
            {[
              { y1: 38, y2: 110, c: "#00A2E9", w: 10 },
              { y1: 65, y2: 40, c: "white", w: 6 },
              { y1: 90, y2: 70, c: "#7C3AED", w: 5 },
              { y1: 115, y2: 145, c: "#64748B", w: 4 },
              { y1: 140, y2: 90, c: "#00A2E9", w: 3 },
            ].map((r, i) => (
              <path
                key={i}
                d={`M 45 ${r.y1} C 160 ${r.y1}, 160 ${r.y2}, 275 ${r.y2} L 275 ${r.y2 + r.w} C 160 ${r.y2 + r.w}, 160 ${r.y1 + r.w}, 45 ${r.y1 + r.w} Z`}
                fill={r.c}
                fillOpacity="0.4"
              />
            ))}
          </svg>
        </div>
      );
    case "entity":
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-deep to-accent">
          <svg
            viewBox="0 0 800 280"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {/* Radar polygon, left */}
            <g transform="translate(160, 140)">
              {[1, 0.75, 0.5, 0.25].map((r, i) => {
                const radius = r * 80;
                const points = Array.from({ length: 6 })
                  .map((_, j) => {
                    const a = (Math.PI * 2 * j) / 6 - Math.PI / 2;
                    return `${(Math.cos(a) * radius).toFixed(1)},${(Math.sin(a) * radius).toFixed(1)}`;
                  })
                  .join(" ");
                return (
                  <polygon
                    key={i}
                    points={points}
                    fill="none"
                    stroke="white"
                    strokeOpacity="0.25"
                    strokeWidth="1"
                  />
                );
              })}
              <polygon
                points="0,-72 62,-30 56,38 -2,68 -56,38 -62,-30"
                fill="#00A2E9"
                fillOpacity="0.35"
                stroke="#00A2E9"
                strokeWidth="2"
              />
            </g>
            {/* Pathway cards, right */}
            <g transform="translate(330, 70)">
              {[
                { y: 0, pct: "78%" },
                { y: 50, pct: "71%" },
                { y: 100, pct: "54%" },
                { y: 150, pct: "86%" },
              ].map((c, i) => (
                <g key={i} transform={`translate(0, ${c.y})`}>
                  <rect
                    x="0"
                    y="0"
                    width="380"
                    height="38"
                    rx="4"
                    fill="white"
                    fillOpacity="0.08"
                    stroke="white"
                    strokeOpacity="0.2"
                  />
                  <rect x="0" y="0" width="4" height="38" fill="#00A2E9" />
                  <text
                    x="16"
                    y="24"
                    fill="white"
                    fontFamily="Inter, sans-serif"
                    fontSize="12"
                    fontWeight="600"
                    opacity="0.85"
                  >
                    {["UK ILR", "US EB-1A", "Singapore GIP", "UAE renewal"][i]}
                  </text>
                  <text
                    x="364"
                    y="25"
                    fill="white"
                    fontFamily="Inter, sans-serif"
                    fontSize="15"
                    fontWeight="800"
                    textAnchor="end"
                  >
                    {c.pct}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      );
  }
}
