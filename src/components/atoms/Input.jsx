import { forwardRef } from 'react'

const baseStyle = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

/**
 * Input — universal text/number input primitive.
 * Forwards all standard <input> props.
 */
export const Input = forwardRef(function Input(
  { className = '', ...rest },
  ref
) {
  return <input ref={ref} className={[baseStyle, className].filter(Boolean).join(' ')} {...rest} />
})

export default Input
