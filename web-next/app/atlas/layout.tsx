import { AtlasDisclosureRibbon } from "@/components/atlas/disclosure-ribbon";

export const metadata = {
  title: "ATLAS preview",
};

export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AtlasDisclosureRibbon />
      <div className="container flex items-center gap-3 py-2">
        <img
          src="/brand/atlas-primary-full-color.svg"
          alt="ATLAS"
          width={64}
          height={28}
          className="block h-7 w-auto"
        />
        <span aria-hidden className="text-ink-faint/50 text-[10px] leading-none">
          ·
        </span>
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink-soft/70">
          Preview
        </span>
      </div>
      {children}
    </>
  );
}
