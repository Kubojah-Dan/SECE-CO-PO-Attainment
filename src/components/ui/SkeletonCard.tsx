export function SkeletonCard() {
  return (
    <div
      className="bg-white border border-brand-100 rounded-card p-5 flex flex-col gap-4 animate-pulse"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-brand-100" />
        <div className="w-12 h-5 rounded-full bg-brand-100" />
      </div>
      <div>
        <div className="w-16 h-7 rounded bg-brand-100 mb-2" />
        <div className="w-28 h-3 rounded bg-brand-100" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div
      className="h-10 rounded bg-brand-100 animate-pulse"
      aria-hidden="true"
    />
  )
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading table">
      <div className="h-8 rounded bg-brand-100 animate-pulse opacity-60" />
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
