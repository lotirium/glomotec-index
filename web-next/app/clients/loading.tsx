export default function Loading() {
  return (
    <>
      <div className="border-b border-line/70 bg-surface/40">
        <div className="container py-12 space-y-3">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="skeleton h-9 w-72 rounded-md" />
          <div className="skeleton h-4 w-2/3 rounded-md" />
        </div>
      </div>
      <div className="container py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-line bg-surface p-5 shadow-soft space-y-4"
          >
            <div className="skeleton h-5 w-28 rounded-full" />
            <div className="skeleton h-5 w-3/4 rounded-md" />
            <div className="skeleton h-3 w-2/3 rounded-full" />
            <div className="skeleton h-12 w-32 rounded-md mt-4" />
            <div className="grid grid-cols-3 gap-3 pt-3">
              <div className="skeleton h-3 w-full rounded-full" />
              <div className="skeleton h-3 w-full rounded-full" />
              <div className="skeleton h-3 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
