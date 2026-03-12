import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Tooltip from './Tooltip';

function fmtUsd(n) {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const TYPE_CONFIG = {
  cex: { label: 'CEX', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  dex: { label: 'DEX', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  'lending-decentralized': { label: 'Lending', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  fund: { label: 'Fund', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  misc: { label: 'Misc', bg: 'bg-blue-500/15', text: 'text-blue-400' },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.misc;
  let label = cfg.label;
  if (!TYPE_CONFIG[type] && type) {
    if (type.includes('lending')) {
      label = 'Lending';
    } else {
      label = type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  const c = TYPE_CONFIG[type] || (type?.includes('lending') ? TYPE_CONFIG['lending-decentralized'] : TYPE_CONFIG.misc);
  return (
    <span className={`inline-flex text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0 rounded ${c.bg} ${c.text}`}>
      {label}
    </span>
  );
}

const COLUMNS = [
  { key: 'rank', label: '#', sortable: false, width: 'w-8' },
  { key: 'entity', label: 'Entity', sortable: false, width: 'flex-1 min-w-0' },
  { key: 'balanceUsd', label: 'Balance', sortable: true, width: 'w-24', align: 'text-right' },
  { key: 'share', label: 'Share', sortable: true, width: 'w-28', align: 'text-right' },
  { key: 'change', label: 'Change', sortable: true, width: 'w-20', align: 'text-right' },
];

export default function HoldersTable({ holders = [], totalHeld = 0 }) {
  const [sortKey, setSortKey] = useState('balanceUsd');
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
    const arr = [...holders];
    const dir = sortDir === 'asc' ? 1 : -1;

    arr.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case 'balanceUsd':
          av = a.balanceUsd || 0;
          bv = b.balanceUsd || 0;
          break;
        case 'share':
          av = totalHeld > 0 ? a.balanceUsd / totalHeld : 0;
          bv = totalHeld > 0 ? b.balanceUsd / totalHeld : 0;
          break;
        case 'change': {
          const ac = a.prevBalanceUsd > 0 ? ((a.balanceUsd - a.prevBalanceUsd) / a.prevBalanceUsd) * 100 : 0;
          const bc = b.prevBalanceUsd > 0 ? ((b.balanceUsd - b.prevBalanceUsd) / b.prevBalanceUsd) * 100 : 0;
          av = ac;
          bv = bc;
          break;
        }
        default:
          av = a.balanceUsd || 0;
          bv = b.balanceUsd || 0;
      }
      return (av - bv) * dir;
    });
    return arr;
  }, [holders, sortKey, sortDir, totalHeld]);

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
        <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Top RLUSD Holders</span>
        <span className="text-[10px] font-mono text-zinc-600">
          {holders.length} entities
        </span>
      </div>

      {/* Scrollable Table */}
      <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
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
            {sorted.map((h, i) => {
              const rank = i + 1;
              const sharePct = totalHeld > 0 ? (h.balanceUsd / totalHeld) * 100 : 0;
              const change = h.prevBalanceUsd > 0
                ? ((h.balanceUsd - h.prevBalanceUsd) / h.prevBalanceUsd) * 100
                : h.balanceUsd > 0 ? 100 : 0;
              const isUp = change >= 0;

              return (
                <tr
                  key={h.entityId || i}
                  className="border-b border-[#1a1d25]/50 hover:bg-[#12141a] transition-colors"
                >
                  {/* Rank */}
                  <td className="px-3 py-1.5 font-mono text-xs text-zinc-500 w-8">
                    {rank}
                  </td>

                  {/* Entity */}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <TypeBadge type={h.entityType} />
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {h.entityName || 'Unknown'}
                      </span>
                    </div>
                  </td>

                  {/* Balance */}
                  <td className="px-3 py-1.5 text-right">
                    <Tooltip content={h.balanceUsd?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) || '--'}>
                      <span className="font-mono text-xs text-zinc-100">
                        {fmtUsd(h.balanceUsd)}
                      </span>
                    </Tooltip>
                  </td>

                  {/* Share */}
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-mono text-xs text-zinc-300">
                        {sharePct.toFixed(1)}%
                      </span>
                      <div className="w-12 h-0.5 rounded bg-zinc-700 overflow-hidden">
                        <div
                          className="h-full rounded bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${Math.min(sharePct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Change */}
                  <td className="px-3 py-1.5 text-right">
                    <span
                      className={`font-mono text-[11px] ${
                        isUp ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isUp ? '\u25B2' : '\u25BC'} {Math.abs(change).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
