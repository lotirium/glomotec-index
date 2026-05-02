export default function Loading() {
  return (
    <>
      <div className="border-b border-line/70 bg-surface/40">
        <div className="container py-12 space-y-3">
          <div className="skeleton h-3 w-32 rounded-full" />
          <div className="skeleton h-9 w-1/2 rounded-md" />
          <div className="skeleton h-4 w-2/3 rounded-md" />
        </div>
      </div>
      <div className="container py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-line bg-surface p-4 shadow-soft space-y-2"
          >
            <div className="skeleton h-3 w-1/2 rounded-full" />
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-2/3 rounded-full" />
          </div>
        ))}
      </div>
    </>
  );
}
