"use client";

export function CompletionProgressBar({
  total,
  linked,
}: {
  total: number;
  linked: number;
}) {
  const pct = total > 0 ? Math.round((linked / total) * 100) : 0;
  const isComplete = linked >= total && total > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="opacity-60">
          {linked}/{total} tasks verified
        </span>
        <span
          className={isComplete ? "text-green-400 font-bold" : "opacity-40"}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete
              ? "bg-gradient-to-r from-green-500 to-emerald-400"
              : "bg-gradient-to-r from-primary to-yellow-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
