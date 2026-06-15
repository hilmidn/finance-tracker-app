import { forwardRef } from 'react'

const baseStyle = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

/**
 * Input — universal text/number input primitive.
 *
 * Props:
 * - leftIcon: Lucide icon component (renders inside, with left padding)
 * - Forwards all standard <input> props (incl. type, value, onChange, etc.)
 */
export const Input = forwardRef(function Input(
  { className = '', leftIcon: LeftIcon, ...rest },
  ref
) {
  const input = (
    <input
      ref={ref}
      className={[baseStyle, LeftIcon ? 'pl-10' : '', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
  if (!LeftIcon) return input
  return (
    <div className="relative">
      <LeftIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      {input}
    </div>
  )
})

export default Input
