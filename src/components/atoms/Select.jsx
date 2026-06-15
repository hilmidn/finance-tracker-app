import { forwardRef } from 'react'

const baseStyle = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

/**
 * Select — universal dropdown primitive.
 * Options: array of { value, label }.
 */
export const Select = forwardRef(function Select(
  { options = [], value, onChange, placeholder, className = '', ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={[baseStyle, className].filter(Boolean).join(' ')}
      value={value ?? ''}
      onChange={onChange}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
})

export default Select
