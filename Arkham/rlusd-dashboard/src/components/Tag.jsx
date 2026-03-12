const colorMap = {
  blue: 'bg-blue-500/10 text-blue-400',
  green: 'bg-green-500/10 text-green-400',
  red: 'bg-red-500/10 text-red-400',
  yellow: 'bg-yellow-500/10 text-yellow-400',
  purple: 'bg-purple-500/10 text-purple-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
}

export function Tag({ children, color = 'blue', className = '' }) {
  const colors = colorMap[color] || colorMap.blue

  return (
    <span
      className={`inline-flex items-center rounded-full text-xs font-medium px-2.5 py-0.5 ${colors} ${className}`}
    >
      {children}
    </span>
  )
}
