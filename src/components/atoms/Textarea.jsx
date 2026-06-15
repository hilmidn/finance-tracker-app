import { forwardRef } from 'react'

const baseStyle = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none'

/**
 * Textarea — universal multi-line input primitive.
 * Auto-resizes disabled by default (resize-none).
 */
export const Textarea = forwardRef(function Textarea(
  { rows = 3, className = '', ...rest },
  ref
) {
  return <textarea ref={ref} rows={rows} className={[baseStyle, className].filter(Boolean).join(' ')} {...rest} />
})

export default Textarea
