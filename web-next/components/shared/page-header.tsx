import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  /**
   * "hero" applies the navy-to-cyan signature gradient. Permitted at hero
   * scale only on the home page per brand v1.0 enforcement.
   */
  variant?: "default" | "hero";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  trailing,
  className,
  variant = "default",
}: Props) {
  const isHero = variant === "hero";
  return (
    <header
      className={cn(
        "border-b border-line",
        isHero ? "hero-gradient text-surface" : "bg-bg",
        className,
      )}
    >
      <div className="container py-24 md:py-32">
        <div className="mx-auto w-full md:max-w-[78%]">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div className="space-y-6">
              {eyebrow && (
                <>
                  <p
                    className={cn(
                      "text-kicker uppercase",
                      isHero ? "text-surface/70" : "text-ink-faint",
                    )}
                  >
                    {eyebrow}
                  </p>
                  <hr
                    className={cn(
                      "max-w-[3rem] border-t",
                      isHero ? "border-surface/40" : "border-line",
                    )}
                    aria-hidden
                  />
                </>
              )}
              <h1
                className={cn(
                  "font-bold tracking-tight text-[2.5rem] leading-[1.15] md:text-[3rem] md:leading-[1.15] lg:text-[3.5rem] lg:leading-[1.1]",
                  isHero ? "text-surface" : "text-ink",
                )}
              >
                {title}
              </h1>
              {description && (
                <p
                  className={cn(
                    "text-lead leading-relaxed max-w-2xl pt-2",
                    isHero ? "text-surface/85" : "text-ink-muted",
                  )}
                >
                  {description}
                </p>
              )}
            </div>
            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>
          {meta && (
            <div
              className={cn(
                "mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-2xs tabular",
                isHero ? "text-surface/75" : "text-ink-muted",
              )}
            >
              {meta}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
