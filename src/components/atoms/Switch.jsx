import { forwardRef } from 'react'

/**
 * Switch — iOS-style toggle primitive.
 * Fires onChange with the new value (not the event).
 * Used in MemberList for share preference toggles.
 */
export const Switch = forwardRef(function Switch(
  { checked = false, onChange, disabled = false, label, className = '', ...rest },
  ref
) {
  const handleClick = () => {
    if (disabled) return
    onChange?.(!checked)
  }

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-purple-500' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      {...rest}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
})

export default Switch
