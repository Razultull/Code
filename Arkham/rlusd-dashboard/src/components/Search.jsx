import { useState, useEffect, useRef } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

export function SearchButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
      aria-label="Search"
    >
      <FiSearch size={16} />
    </button>
  )
}

export function SearchDialog({ open, onClose }) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          onClose()
        }
      }
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-zinc-800 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700 shadow-2xl overflow-hidden">
        <div className="flex items-center px-4 border-b border-zinc-200 dark:border-zinc-700">
          <FiSearch className="text-zinc-400 shrink-0" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities, addresses..."
            className="flex-1 px-3 py-4 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
          />
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="px-4 py-8 text-center text-sm text-zinc-500">
          {query
            ? `No results for "${query}"`
            : 'Start typing to search...'}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 font-mono">Esc</kbd>
          <span>to close</span>
        </div>
      </div>
    </div>
  )
}
