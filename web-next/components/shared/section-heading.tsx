import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  trailing?: React.ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  trailing,
}: Props) {
  return (
    <div className={cn("flex items-end justify-between gap-6", className)}>
      <div className="space-y-1">
        {eyebrow && (
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-ink leading-tight">
          {title}
        </h2>
        {description && (
          <p className="max-w-xl text-sm text-ink-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );
}
