import { cn } from "@/lib/utils";

/**
 * 6px dot rendered next to "Scored Xm ago". Diagnostic only:
 *   • charcoal/40 = the score was replayed from cache (Redis or fixture)
 *   • cyan/60     = the score was freshly computed against Anthropic
 *
 * No label, no tooltip — invisible to anyone not looking for it, instantly
 * readable when triaging cold-start drift in production.
 */
export function CacheDot({
  state,
  className,
}: {
  state: "hit" | "miss" | "unknown";
  className?: string;
}) {
  const tone =
    state === "miss"
      ? "bg-cyan/60"
      : state === "hit"
        ? "bg-charcoal/40"
        : "bg-ink-faint/40";
  return (
    <span
      aria-hidden
      title={
        state === "miss"
          ? "fresh: Anthropic scored this on this request"
          : state === "hit"
            ? "cached: replayed from Redis or fixture"
            : ""
      }
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full align-middle",
        tone,
        className,
      )}
    />
  );
}
