import { forwardRef } from 'react'

const colorStyles = {
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-400',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
}

const sizeStyles = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
}

/**
 * Badge — colored label/pill for inline status indicators.
 * Used in TransactionItem for type tags (Masuk/Keluar/Transfer).
 */
export const Badge = forwardRef(function Badge(
  { children, color = 'gray', size = 'xs', className = '', ...rest },
  ref
) {
  const cls = ['inline-flex items-center rounded-md font-medium', colorStyles[color], sizeStyles[size], className]
    .filter(Boolean).join(' ')
  return <span ref={ref} className={cls} {...rest}>{children}</span>
})

export default Badge
