import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function fmtUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const change = d.current - d.previous;
  const pct = d.previous > 0 ? (change / d.previous) * 100 : 100;
  const isUp = change >= 0;

  return (
    <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md shadow-xl px-3 py-2 text-[11px] font-mono">
      <div className="font-semibold text-zinc-100 mb-1">{d.fullName}</div>
      <div className="text-zinc-400 mb-0.5">
        Current: <span className="text-zinc-100 font-semibold">{fmtUsd(d.current)}</span>
      </div>
      <div className="text-zinc-400 mb-0.5">
        Previous: <span className="text-zinc-100 font-semibold">{fmtUsd(d.previous)}</span>
      </div>
      <div className={`font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '\u25B2' : '\u25BC'} {Math.abs(pct).toFixed(1)}% ({isUp ? '+' : ''}{fmtUsd(change)})
      </div>
    </div>
  );
}

export default function HoldersChart({ holders }) {
  const data = (holders || []).slice(0, 15).map(h => ({
    name: h.entityName.length > 8 ? h.entityName.slice(0, 8) + '\u2026' : h.entityName,
    fullName: h.entityName,
    current: h.balanceUsd,
    previous: h.prevBalanceUsd,
    type: h.entityType,
  }));

  if (!data.length) {
    return (
      <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md p-6">
        <div className="text-zinc-400 text-center py-12">No holder data available</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md">
      <div className="px-3 py-2 border-b border-[#1a1d25]">
        <h3 className="text-xs font-semibold text-zinc-100">Holdings Comparison</h3>
        <p className="text-[10px] text-zinc-600 mt-0.5">Current vs Previous Period</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 50, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1d25" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#52525b', fontSize: 10 }}
              angle={-40}
              textAnchor="end"
              height={70}
              axisLine={{ stroke: '#1a1d25' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#52525b', fontSize: 10 }}
              tickFormatter={fmtUsd}
              axisLine={{ stroke: '#1a1d25' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }} />
            <Bar
              dataKey="previous"
              name="Previous Period"
              fill="#2563eb"
              fillOpacity={0.25}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="current"
              name="Current"
              fill="#2563eb"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
