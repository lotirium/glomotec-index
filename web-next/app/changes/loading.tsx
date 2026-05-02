export default function Loading() {
  return (
    <>
      <div className="border-b border-line/70 bg-surface/40">
        <div className="container py-12 space-y-3">
          <div className="skeleton h-3 w-28 rounded-full" />
          <div className="skeleton h-9 w-72 rounded-md" />
          <div className="skeleton h-4 w-2/3 rounded-md" />
        </div>
      </div>
      <div className="container py-10 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5"
          >
            <div className="space-y-2">
              <div className="skeleton h-3 w-24 rounded-full" />
              <div className="skeleton h-3 w-32 rounded-full" />
            </div>
            <div className="rounded-lg border border-line bg-surface p-6 shadow-soft space-y-3">
              <div className="skeleton h-5 w-2/3 rounded-md" />
              <div className="skeleton h-3 w-full rounded-full" />
              <div className="skeleton h-3 w-3/4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
