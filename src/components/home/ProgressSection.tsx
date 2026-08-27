interface ProgressSectionProps {
  studied: number;
  total: number;
}

export function ProgressSection({ studied, total }: ProgressSectionProps) {
  const percentage = total === 0 ? 0 : Math.min(100, (studied / total) * 100);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm shadow-navy/5 border border-navy/5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-navy text-sm sm:text-base">
          Bugünkü ilerleme
        </h3>
        <span className="text-sm font-semibold text-lila-dark">
          {studied} / {total} kart
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full rounded-full bg-lila-light overflow-hidden">
        <div
          className="h-full rounded-full bg-lila transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}
