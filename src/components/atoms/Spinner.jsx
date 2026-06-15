/**
 * Spinner — animated loading indicator.
 * Uses SVG with stroke rotation, respects currentColor.
 */
export function Spinner({ size = 16, className = '', ...rest }) {
  return (
    <svg
      role="status"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      fill="none"
      aria-label="Loading"
      {...rest}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default Spinner
