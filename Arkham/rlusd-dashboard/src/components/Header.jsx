import { useState, useCallback, useEffect } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { SearchButton, SearchDialog } from './Search'

const intervals = [
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
]

export function DashboardHeader({ tokenInfo, interval, onIntervalChange }) {
  const [searchOpen, setSearchOpen] = useState(false)

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const price = tokenInfo?.price
  const change24h = tokenInfo?.change24h

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0b0d11] border-b border-zinc-800/50 h-11 flex items-center px-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-white text-sm tracking-tight">RLUSD</span>
          <span className="font-mono text-zinc-600 text-[10px] uppercase tracking-widest">Analytics</span>
        </div>

        {/* Center: Price */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {price != null && (
            <>
              <span className="font-mono text-white text-lg font-bold">${Number(price).toFixed(4)}</span>
              {change24h != null && (
                <span className={`font-mono text-xs font-medium ${change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {change24h >= 0 ? '+' : ''}{Number(change24h).toFixed(2)}%
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {onIntervalChange && (
            <div className="flex items-center bg-zinc-800/60 rounded-md p-0.5">
              {intervals.map((i) => (
                <button
                  key={i.value}
                  onClick={() => onIntervalChange(i.value)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                    interval === i.value
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          )}

          <SearchButton onClick={openSearch} />
          <ThemeToggle />
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </>
  )
}

export default DashboardHeader
