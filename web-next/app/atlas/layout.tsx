import { AtlasDisclosureRibbon } from "@/components/atlas/disclosure-ribbon";

export const metadata = {
  title: "ATLAS preview",
};

export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AtlasDisclosureRibbon />
      <div className="container py-2">
        <p className="text-2xs font-medium tracking-[0.18em] uppercase text-ink-soft/70">
          GLOMOTEC <span aria-hidden className="text-ink-faint/60">·</span> ATLAS preview
        </p>
      </div>
      {children}
    </>
  );
}
