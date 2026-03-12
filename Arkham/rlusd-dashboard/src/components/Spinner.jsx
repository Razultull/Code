export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-5 w-5 border-2 border-zinc-800 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}
