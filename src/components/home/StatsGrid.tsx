interface StatItemProps {
  emoji: string;
  label: string;
  value: string;
}

function StatItem({ emoji, label, value }: StatItemProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm shadow-navy/5 border border-navy/5 flex flex-col gap-1">
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-xs font-semibold text-navy-soft">{label}</span>
      <span className="text-lg font-bold text-navy">{value}</span>
    </div>
  );
}

interface StatsGridProps {
  reviewCount: number;
  totalSolved: number;
  bestStreak: number;
}

export function StatsGrid({
  reviewCount,
  totalSolved,
  bestStreak,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatItem
        emoji="🔴"
        label="Tekrar Bekleyen"
        value={`${reviewCount} kart`}
      />
      <StatItem
        emoji="🎯"
        label="Toplam Çözülen"
        value={`${totalSolved} kart`}
      />
      <StatItem emoji="⭐" label="En İyi Seri" value={`${bestStreak} doğru`} />
    </div>
  );
}
