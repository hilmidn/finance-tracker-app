import { forwardRef } from 'react'

const colorStyles = {
  indigo: 'bg-indigo-100 text-indigo-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
}

function deriveInitial(seed) {
  if (!seed) return '?'
  return seed.substring(0, 2).toUpperCase()
}

/**
 * Avatar — circular initials badge.
 * Seed is typically user_id; first 2 chars shown as initials.
 */
export const Avatar = forwardRef(function Avatar(
  { seed, color = 'indigo', size = 'md', className = '', ...rest },
  ref
) {
  const sizeCls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  const cls = [
    'rounded-full flex items-center justify-center font-bold flex-shrink-0',
    colorStyles[color],
    sizeCls,
    className,
  ].filter(Boolean).join(' ')
  return <div ref={ref} className={cls} {...rest}>{deriveInitial(seed)}</div>
})

export default Avatar
