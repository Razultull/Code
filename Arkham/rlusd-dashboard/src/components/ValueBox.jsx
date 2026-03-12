export function ValueBox({
  title,
  value,
  change,
  subtitle,
  className = '',
}) {
  const isPositive = change != null && change >= 0

  return (
    <div
      className={`bg-[#0f1117] border border-[#1a1d25] rounded-md p-3 ${className}`}
    >
      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 block mb-1">
        {title}
      </span>

      <div className="flex items-baseline gap-2">
        <span className="text-lg font-mono font-semibold text-zinc-100">{value}</span>

        {change != null && (
          <span
            className={`text-[10px] font-mono font-medium ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{subtitle}</p>
      )}
    </div>
  )
}
