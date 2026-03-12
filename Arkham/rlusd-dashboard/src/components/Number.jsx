function formatCompact(value) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(2) + 'B'
  }
  if (abs >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M'
  }
  if (abs >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K'
  }
  return value.toFixed(2)
}

function formatFull(value) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function Number({
  value,
  prefix = '',
  suffix = '',
  className = '',
  format = 'compact',
}) {
  if (value == null || isNaN(value)) {
    return <span className={className}>—</span>
  }

  const displayed =
    format === 'full' ? formatFull(value) : formatCompact(value)
  const fullPrecision = value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })

  return (
    <span className={className} title={`${prefix}${fullPrecision}${suffix}`}>
      {prefix}
      {displayed}
      {suffix}
    </span>
  )
}
