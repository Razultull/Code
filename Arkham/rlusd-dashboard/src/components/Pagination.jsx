import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  const btn =
    'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 text-sm font-medium rounded-md transition-colors';
  const inactive = 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200';
  const active = 'bg-blue-600 text-white';
  const disabled = 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed';

  return (
    <div className="flex items-center justify-center gap-1 pt-3">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${btn} ${currentPage <= 1 ? disabled : inactive}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={`${btn} ${inactive}`}>
            1
          </button>
          {start > 2 && <span className="text-zinc-600 text-sm px-1">...</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`${btn} ${p === currentPage ? active : inactive}`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-zinc-600 text-sm px-1">...</span>}
          <button onClick={() => onPageChange(totalPages)} className={`${btn} ${inactive}`}>
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${btn} ${currentPage >= totalPages ? disabled : inactive}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
