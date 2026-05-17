export function Spinner({ size = "sm", className = "" }) {
  const s = size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-8 h-8";
  return (
    <svg className={`animate-spin ${s} ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="shimmer h-4 rounded w-2/3" />
      <div className="shimmer h-3 rounded w-1/2" />
      <div className="shimmer h-3 rounded w-3/4" />
      <div className="shimmer h-2 rounded-full w-full mt-2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="shimmer h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-slate-100">
          <div className="shimmer h-3 rounded flex-1" />
          <div className="shimmer h-3 rounded flex-1" />
          <div className="shimmer h-3 rounded w-20" />
          <div className="shimmer h-3 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="shimmer h-8 rounded w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-5">
            <div className="shimmer h-3 rounded w-24 mb-2" />
            <div className="shimmer h-8 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}
