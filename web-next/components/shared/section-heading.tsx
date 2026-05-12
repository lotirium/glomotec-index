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
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="space-y-2 max-w-2xl">
        {eyebrow && (
          <>
            <p className="text-kicker uppercase text-ink-faint">{eyebrow}</p>
            <hr
              className="max-w-[3rem] border-t border-line"
              aria-hidden
            />
          </>
        )}
        <h2 className="text-h2 text-ink leading-tight pt-1">{title}</h2>
        {description && (
          <p className="text-sm text-ink-muted leading-relaxed pt-1">
            {description}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );
}
