interface BadgeProps {
  label: string
  color?: 'blue' | 'green' | 'yellow' | 'gray' | 'red'
}

const colorMap: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  gray:   'bg-gray-100 text-gray-600',
  red:    'bg-rose-100 text-rose-700',
}

export default function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]}`}>
      {label}
    </span>
  )
}
