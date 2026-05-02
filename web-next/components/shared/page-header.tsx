import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  trailing,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "border-b border-line/70 bg-surface/40",
        className,
      )}
    >
      <div className="container py-10 md:py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2.5">
            {eyebrow && (
              <p className="font-mono text-2xs uppercase tracking-[0.22em] text-ink-faint">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-ink leading-[1.1] md:text-[2.1rem]">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-ink-muted md:text-base leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {trailing && <div className="shrink-0">{trailing}</div>}
        </div>
        {meta && (
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-2xs text-ink-muted tabular">
            {meta}
          </div>
        )}
      </div>
    </header>
  );
}
