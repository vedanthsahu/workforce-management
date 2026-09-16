export function FindTeammateSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-52 mt-3" />
            <div className="h-3 bg-gray-100 rounded w-36" />
          </div>
          <div className="w-48 h-20 bg-gray-100 rounded-xl shrink-0" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-100 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
