import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Network,
  CircleDot,
  Search,
  SlidersHorizontal,
  ArrowDownUp,
} from 'lucide-react';
import NetworkView from './NetworkView';
import DistributionView from './DistributionView';
import {
  mergeEntities,
  buildLinks,
  TYPE_COLORS,
  TYPE_CONFIG,
  fmtUsd,
  FLOW_STYLES,
} from './utils';

const MIN_BALANCE_PRESETS = [
  { label: '$0', value: 0 },
  { label: '$10K', value: 10_000 },
  { label: '$100K', value: 100_000 },
  { label: '$1M', value: 1_000_000 },
];

const VIEW_MODES = [
  { key: 'network', label: 'Network', icon: Network },
  { key: 'distribution', label: 'Distribution', icon: CircleDot },
];

const SIZE_BY_OPTIONS = [
  { key: 'balance', label: 'Balance' },
  { key: 'volume', label: 'Volume' },
  { key: 'txCount', label: 'Txns' },
];

const SORT_OPTIONS = [
  { key: 'balance', label: 'Balance' },
  { key: 'change', label: 'Change %' },
  { key: 'share', label: 'Share %' },
];

const COLOR_MODES = [
  { key: 'type', label: 'Type' },
  { key: 'change', label: 'Change' },
];

const FLOW_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Inflow' },
  { key: 'out', label: 'Outflow' },
];

/* ---------- small reusable sub-components ---------- */

function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div
      className={`inline-flex rounded-md border border-zinc-700/60 overflow-hidden ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
              active
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TypeChip({ typeKey, active, onClick }) {
  const cfg = TYPE_CONFIG[typeKey];
  if (!cfg) return null;
  const color = TYPE_COLORS[typeKey];
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border ${
        active
          ? `${cfg.bg} ${cfg.text} border-transparent`
          : 'bg-transparent text-zinc-600 border-zinc-700/50 hover:text-zinc-400'
      }`}
      style={active ? { borderColor: `${color}33` } : undefined}
    >
      {cfg.label}
    </button>
  );
}

function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div className="inline-flex rounded-md border border-zinc-700/60 overflow-hidden">
      {VIEW_MODES.map(({ key, label, icon: Icon }) => {
        const active = viewMode === key;
        return (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors ${
              active
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- main component ---------- */

export default function EntityExplorer({ holders, counterparties, totalHeld }) {
  /* --- state --- */
  const [viewMode, setViewMode] = useState('network');
  const [filters, setFilters] = useState({
    types: new Set(['cex', 'dex', 'lending-decentralized', 'misc', 'fund']),
    flowDirection: 'all',
    minBalance: 0,
    searchTerm: '',
    sizeBy: 'balance',
  });
  const [colorMode, setColorMode] = useState('type');
  const [sortBy, setSortBy] = useState('balance');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

  const vizRef = useRef(null);

  /* --- resize observer --- */
  useEffect(() => {
    const el = vizRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0) {
          setDimensions({ width: Math.floor(width), height: Math.max(420, Math.floor(height)) });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* --- data processing (memoised) --- */
  const allEntities = useMemo(
    () => mergeEntities(holders, counterparties, totalHeld),
    [holders, counterparties, totalHeld],
  );

  const links = useMemo(
    () => buildLinks(counterparties),
    [counterparties],
  );

  const filteredEntities = useMemo(() => {
    let list = allEntities;

    // type filter
    list = list.filter((e) => filters.types.has(e.type));

    // flow direction filter
    if (filters.flowDirection !== 'all') {
      list = list.filter((e) => e.flow === filters.flowDirection || e.isHolder);
    }

    // min balance
    if (filters.minBalance > 0) {
      list = list.filter((e) => e.balanceUsd >= filters.minBalance);
    }

    // search
    if (filters.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.address && e.address.toLowerCase().includes(q)),
      );
    }

    // sort
    if (viewMode === 'distribution') {
      list = [...list].sort((a, b) => {
        if (sortBy === 'balance') return b.balanceUsd - a.balanceUsd;
        if (sortBy === 'change') return b.changePct - a.changePct;
        if (sortBy === 'share') return b.share - a.share;
        return 0;
      });
    }

    return list;
  }, [allEntities, filters, viewMode, sortBy]);

  const filteredLinks = useMemo(() => {
    const entityIds = new Set(filteredEntities.map((e) => e.id));
    let result = links.filter(
      (l) => entityIds.has(l.source) || entityIds.has(l.target),
    );
    if (filters.flowDirection !== 'all') {
      result = result.filter((l) => l.flow === filters.flowDirection);
    }
    return result;
  }, [filteredEntities, links, filters.flowDirection]);

  /* --- stats (memoised) --- */
  const stats = useMemo(() => {
    const count = filteredEntities.length;
    const totalVol = filteredEntities.reduce((s, e) => s + (e.volume || 0), 0);
    const avgBal =
      count > 0
        ? filteredEntities.reduce((s, e) => s + e.balanceUsd, 0) / count
        : 0;

    let topGainer = null;
    let topLoser = null;
    for (const e of filteredEntities) {
      if (!topGainer || e.changePct > topGainer.changePct) topGainer = e;
      if (!topLoser || e.changePct < topLoser.changePct) topLoser = e;
    }

    return { count, totalVol, avgBal, topGainer, topLoser };
  }, [filteredEntities]);

  /* --- callbacks --- */
  const toggleType = useCallback((typeKey) => {
    setFilters((prev) => {
      const next = new Set(prev.types);
      if (next.has(typeKey)) {
        next.delete(typeKey);
      } else {
        next.add(typeKey);
      }
      return { ...prev, types: next };
    });
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fmtChange = (pct) => {
    if (pct == null || isNaN(pct)) return '--';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  /* --- render --- */
  return (
    <div className="flex flex-col rounded-xl border border-[#1a1d25] bg-[#0f1117] overflow-hidden">
      {/* ---- header ---- */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1d25]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Entity Intelligence
          </h2>
          <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {stats.count}
          </span>
        </div>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* ---- controls bar ---- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 border-b border-[#1a1d25] bg-[#0d0f14]">
        {/* type chips */}
        <div className="flex items-center gap-1">
          {Object.keys(TYPE_CONFIG).map((t) => (
            <TypeChip
              key={t}
              typeKey={t}
              active={filters.types.has(t)}
              onClick={() => toggleType(t)}
            />
          ))}
        </div>

        {/* divider */}
        <div className="w-px h-4 bg-zinc-800" />

        {/* flow direction -- network only */}
        {viewMode === 'network' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
              Flow
            </span>
            <SegmentedControl
              options={FLOW_OPTIONS}
              value={filters.flowDirection}
              onChange={(v) => updateFilter('flowDirection', v)}
            />
          </div>
        )}

        {/* size by -- network only */}
        {viewMode === 'network' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
              Size
            </span>
            <SegmentedControl
              options={SIZE_BY_OPTIONS}
              value={filters.sizeBy}
              onChange={(v) => updateFilter('sizeBy', v)}
            />
          </div>
        )}

        {/* color mode -- distribution only */}
        {viewMode === 'distribution' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
              Color
            </span>
            <SegmentedControl
              options={COLOR_MODES}
              value={colorMode}
              onChange={setColorMode}
            />
          </div>
        )}

        {/* sort by -- distribution only */}
        {viewMode === 'distribution' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
              Sort
            </span>
            <SegmentedControl
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={setSortBy}
            />
          </div>
        )}

        {/* divider */}
        <div className="w-px h-4 bg-zinc-800" />

        {/* search */}
        <div className="relative flex items-center">
          <Search
            size={12}
            className="absolute left-2 text-zinc-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search entity..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="w-32 rounded-md border border-zinc-700/60 bg-transparent py-0.5 pl-6 pr-2 text-[11px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* min balance */}
        <div className="flex items-center gap-1.5">
          <ArrowDownUp size={11} className="text-zinc-600" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
            Min
          </span>
          <select
            value={filters.minBalance}
            onChange={(e) => updateFilter('minBalance', Number(e.target.value))}
            className="rounded-md border border-zinc-700/60 bg-transparent py-0.5 px-1.5 text-[11px] text-zinc-300 outline-none focus:border-zinc-500 appearance-none cursor-pointer"
          >
            {MIN_BALANCE_PRESETS.map((p) => (
              <option key={p.value} value={p.value} className="bg-zinc-900">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---- visualization area ---- */}
      <div ref={vizRef} className="relative flex-1 min-h-[420px]">
        {viewMode === 'network' ? (
          <NetworkView
            entities={filteredEntities}
            links={filteredLinks}
            dimensions={dimensions}
            filters={filters}
            onEntitySelect={setSelectedEntity}
          />
        ) : (
          <DistributionView
            entities={filteredEntities}
            dimensions={dimensions}
            totalHeld={totalHeld}
            filters={filters}
            colorMode={colorMode}
            sortBy={sortBy}
            onEntitySelect={setSelectedEntity}
          />
        )}
      </div>

      {/* ---- stats row ---- */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 border-t border-[#1a1d25] bg-[#0d0f14] text-[11px]">
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">
            <span className="text-zinc-300 font-medium">{stats.count}</span>{' '}
            entities
          </span>
          <span className="text-zinc-500">
            <span className="text-zinc-300 font-medium">
              {fmtUsd(stats.totalVol)}
            </span>{' '}
            total vol
          </span>
          <span className="text-zinc-500">
            <span className="text-zinc-300 font-medium">
              {fmtUsd(stats.avgBal)}
            </span>{' '}
            avg balance
          </span>
        </div>
        <div className="flex items-center gap-4">
          {stats.topGainer && (
            <span className="text-zinc-500">
              Top gainer:{' '}
              <span className="text-green-400 font-medium">
                {stats.topGainer.name}
              </span>{' '}
              <span className="text-green-400/80">
                ({fmtChange(stats.topGainer.changePct)})
              </span>
            </span>
          )}
          {stats.topLoser && stats.topLoser !== stats.topGainer && (
            <span className="text-zinc-500">
              Top loser:{' '}
              <span className="text-red-400 font-medium">
                {stats.topLoser.name}
              </span>{' '}
              <span className="text-red-400/80">
                ({fmtChange(stats.topLoser.changePct)})
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
