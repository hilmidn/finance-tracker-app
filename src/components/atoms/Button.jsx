import { forwardRef } from 'react'

const variantStyles = {
  primary: 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
  ghost: 'text-gray-500 hover:bg-gray-100 active:scale-95',
}

const sizeStyles = {
  sm: 'py-2 px-3 text-xs',
  md: 'py-3 px-4 text-sm',
  lg: 'py-3.5 px-4 text-sm',
}

/**
 * Button — universal button primitive.
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'danger' | 'ghost' (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - loading: shows spinner and disables click
 * - leftIcon, rightIcon: ReactNode
 * - All other <button> props supported
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    leftIcon,
    rightIcon,
    loading = false,
    disabled = false,
    className = '',
    onClick,
    ...rest
  },
  ref
) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const cls = [base, variantStyles[variant], sizeStyles[size], className].filter(Boolean).join(' ')

  const handleClick = (e) => {
    if (disabled || loading) return
    onClick?.(e)
  }

  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <span className="animate-spin" aria-hidden>⏳</span> : leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})

export default Button
