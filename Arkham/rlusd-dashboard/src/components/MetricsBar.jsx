import { Number } from './Number'

export function MetricsBar({ tokenInfo, totalHeld, holderCount, topHolder }) {
  const price = tokenInfo?.price
  const price24hAgo = tokenInfo?.price24hAgo
  const priceChange =
    price != null && price24hAgo != null && price24hAgo !== 0
      ? ((price - price24hAgo) / price24hAgo) * 100
      : null
  const isPositive = priceChange != null && priceChange >= 0

  return (
    <div className="h-7 bg-[#0a0c10] border-b border-[#1a1d25] overflow-x-auto">
      <div className="flex items-center h-full px-3 text-[10px] font-mono whitespace-nowrap min-w-max">
        {/* RLUSD Price */}
        <span className="uppercase text-zinc-600 mr-1.5">RLUSD</span>
        {price != null ? (
          <span className="text-zinc-300 text-[11px]">${price.toFixed(4)}</span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}

        <div className="w-px h-3 bg-zinc-800 mx-3" />

        {/* 24h Change */}
        <span className="uppercase text-zinc-600 mr-1.5">24H CHG</span>
        {priceChange != null ? (
          <span className={`text-[11px] ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}

        <div className="w-px h-3 bg-zinc-800 mx-3" />

        {/* Total Tracked */}
        <span className="uppercase text-zinc-600 mr-1.5">TRACKED</span>
        <Number
          value={totalHeld}
          prefix="$"
          className="text-zinc-300 text-[11px]"
        />

        <div className="w-px h-3 bg-zinc-800 mx-3" />

        {/* Entities */}
        <span className="uppercase text-zinc-600 mr-1.5">ENTITIES</span>
        <span className="text-zinc-300 text-[11px]">{holderCount ?? '—'}</span>

        <div className="w-px h-3 bg-zinc-800 mx-3" />

        {/* Top Holder */}
        <span className="uppercase text-zinc-600 mr-1.5">TOP HOLDER</span>
        <span className="text-zinc-300 text-[11px]">{topHolder ?? '—'}</span>
      </div>
    </div>
  )
}
