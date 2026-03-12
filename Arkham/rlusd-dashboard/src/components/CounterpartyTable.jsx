import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Copy from './Copy';

function fmtUsd(n) {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '--';
  return n.toLocaleString('en-US');
}

function shortenAddr(addr) {
  if (!addr || addr.length < 12) return addr || 'Unknown';
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

const FLOW_STYLES = {
  in: { bg: 'bg-green-400/10', text: 'text-green-400', label: 'IN' },
  out: { bg: 'bg-red-400/10', text: 'text-red-400', label: 'OUT' },
  all: { bg: 'bg-blue-400/10', text: 'text-blue-400', label: 'ALL' },
};

function FlowBadge({ flow }) {
  const cfg = FLOW_STYLES[flow] || FLOW_STYLES.all;
  return (
    <span className={`inline-flex text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0 rounded ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

const COLUMNS = [
  { key: 'rank', label: '#', sortable: false },
  { key: 'entity', label: 'Entity / Address', sortable: false },
  { key: 'flow', label: 'Flow', sortable: false },
  { key: 'transactionCount', label: 'Txns', sortable: true, align: 'text-right' },
  { key: 'usd', label: 'Volume', sortable: true, align: 'text-right' },
];

export default function CounterpartyTable({ counterparties }) {
  const entries = counterparties?.ethereum || [];

  const [sortKey, setSortKey] = useState('usd');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...entries];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[sortKey] || 0;
      const bv = b[sortKey] || 0;
      return (av - bv) * dir;
    });
    return arr;
  }, [entries, sortKey, sortDir]);

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-2.5 h-2.5 text-blue-400" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 text-blue-400" />
    );
  };

  return (
    <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1d25]">
        <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Counterparties</span>
        <span className="text-[10px] font-mono text-zinc-600">
          {entries.length} entries
        </span>
      </div>

      {/* Scrollable Table */}
      <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
        {entries.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">
            No counterparty data available
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1d25]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={[
                      'px-3 py-2 text-[10px] uppercase tracking-wider font-mono text-zinc-600 bg-[#0a0c10] sticky top-0',
                      col.align || 'text-left',
                      col.sortable ? 'cursor-pointer hover:text-zinc-400 transition-colors select-none' : '',
                    ].join(' ')}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((cp, i) => {
                const rank = i + 1;
                const name =
                  cp.address?.arkhamEntity?.name ||
                  cp.address?.arkhamLabel?.name ||
                  null;
                const rawAddr = cp.address?.address;
                const flow = cp.flow || 'all';

                return (
                  <tr
                    key={`${rawAddr}-${flow}-${i}`}
                    className="border-b border-[#1a1d25]/50 hover:bg-[#12141a] transition-colors"
                  >
                    {/* Rank */}
                    <td className="px-3 py-1.5 font-mono text-xs text-zinc-500 w-8">
                      {rank}
                    </td>

                    {/* Entity / Address */}
                    <td className="px-3 py-1.5">
                      {name ? (
                        <span className="text-xs text-zinc-200">{name}</span>
                      ) : (
                        <Copy text={rawAddr || ''}>
                          <span className="font-mono text-[11px] text-zinc-500">
                            {shortenAddr(rawAddr)}
                          </span>
                        </Copy>
                      )}
                    </td>

                    {/* Flow */}
                    <td className="px-3 py-1.5">
                      <FlowBadge flow={flow} />
                    </td>

                    {/* Transactions */}
                    <td className="px-3 py-1.5 text-right">
                      <span className="font-mono text-[11px] text-zinc-500">
                        {fmtNum(cp.transactionCount)}
                      </span>
                    </td>

                    {/* Volume */}
                    <td className="px-3 py-1.5 text-right">
                      <span className="font-mono text-xs text-zinc-100">
                        {fmtUsd(cp.usd)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
