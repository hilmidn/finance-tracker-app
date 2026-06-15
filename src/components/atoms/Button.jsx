import { forwardRef } from 'react'
import { Spinner } from './Spinner'

const variantStyles = {
  primary: 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
  ghost: 'text-gray-500 hover:bg-gray-100 active:scale-95',
}

const sizeStyles = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-12 px-4 text-sm',
  lg: 'h-14 px-5 text-base',
}

const widthStyles = {
  auto: '',
  full: 'w-full',
}

/**
 * Button — universal button primitive.
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'danger' | 'ghost' (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - width: 'auto' | 'full' (default: 'auto')
 * - loading: shows Spinner atom and disables click
 * - leftIcon, rightIcon: ReactNode
 * - All other <button> props supported (incl. type="submit")
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    width = 'auto',
    type,
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
  const cls = [base, variantStyles[variant], sizeStyles[size], widthStyles[width], className].filter(Boolean).join(' ')

  const handleClick = (e) => {
    if (disabled || loading) return
    onClick?.(e)
  }

  return (
    <button
      ref={ref}
      type={type || 'button'}
      className={cls}
      disabled={disabled || loading}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})

export default Button
