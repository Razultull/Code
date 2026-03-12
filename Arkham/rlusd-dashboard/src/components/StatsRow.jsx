function fmt(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function StatsRow({ totalHeld, totalChange, totalChangePct, holderCount, cexTotal, defiTotal }) {
  const isUp = totalChange >= 0;

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">Total Tracked Balance</div>
        <div className="stat-value">{fmt(totalHeld)}</div>
        <div className="stat-sub">Across top {holderCount} entities</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Balance Change</div>
        <div className="stat-value" style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}>
          {isUp ? '+' : ''}{fmt(totalChange)}
        </div>
        <div className="stat-sub" style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}>
          {isUp ? '▲' : '▼'} {Math.abs(totalChangePct).toFixed(2)}% vs prev period
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">CEX Holdings</div>
        <div className="stat-value" style={{ color: 'var(--cyan)' }}>{fmt(cexTotal)}</div>
        <div className="stat-sub">{totalHeld > 0 ? ((cexTotal / totalHeld) * 100).toFixed(1) : 0}% of tracked</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">DeFi Holdings</div>
        <div className="stat-value" style={{ color: 'var(--purple)' }}>{fmt(defiTotal)}</div>
        <div className="stat-sub">{totalHeld > 0 ? ((defiTotal / totalHeld) * 100).toFixed(1) : 0}% of tracked</div>
      </div>
    </div>
  );
}
