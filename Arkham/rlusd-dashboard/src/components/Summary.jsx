import { Number } from './Number'
import { ValueBox } from './ValueBox'

export function Summary({
  holders,
  totalHeld,
  totalChange,
  totalChangePct,
  cexTotal,
  defiTotal,
}) {
  const entityCount = holders?.length ?? 0
  const cexPct =
    totalHeld && totalHeld > 0 ? ((cexTotal / totalHeld) * 100).toFixed(1) : '0.0'
  const defiPct =
    totalHeld && totalHeld > 0 ? ((defiTotal / totalHeld) * 100).toFixed(1) : '0.0'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <ValueBox
        title="Total Tracked"
        value={<Number value={totalHeld} prefix="$" />}
        subtitle={`${entityCount} entities`}
      />

      <ValueBox
        title="Period Change"
        value={<Number value={totalChange} prefix="$" />}
        change={totalChangePct}
      />

      <ValueBox
        title="CEX Holdings"
        value={<Number value={cexTotal} prefix="$" />}
        subtitle={
          <span>
            <span className="text-cyan-400">{cexPct}%</span> of tracked
          </span>
        }
      />

      <ValueBox
        title="DeFi Holdings"
        value={<Number value={defiTotal} prefix="$" />}
        subtitle={
          <span>
            <span className="text-purple-400">{defiPct}%</span> of tracked
          </span>
        }
      />
    </div>
  )
}
