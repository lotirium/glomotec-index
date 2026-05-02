export default function Loading() {
  return (
    <>
      <div className="border-b border-line/70 bg-surface/40">
        <div className="container py-12 space-y-3">
          <div className="skeleton h-3 w-28 rounded-full" />
          <div className="skeleton h-9 w-64 rounded-md" />
          <div className="skeleton h-4 w-2/3 rounded-md" />
        </div>
      </div>
      <div className="container py-10 space-y-10">
        <div className="rounded-lg border border-line bg-surface p-8 shadow-hero space-y-4">
          <div className="skeleton h-5 w-32 rounded-full" />
          <div className="skeleton h-16 w-48 rounded-md" />
          <div className="skeleton h-3 w-3/4 rounded-full" />
          <div className="skeleton h-1.5 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-surface p-5 shadow-soft space-y-2"
              >
                <div className="skeleton h-3 w-1/4 rounded-full" />
                <div className="skeleton h-4 w-3/4 rounded-md" />
                <div className="skeleton h-3 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-line bg-surface p-5 shadow-soft space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-3 w-full rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
