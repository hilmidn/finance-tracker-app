import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('renders with role="status"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has animate-spin class', () => {
    render(<Spinner />)
    expect(screen.getByRole('status').className).toMatch(/animate-spin/)
  })

  it('respects size prop', () => {
    render(<Spinner size={32} />)
    const el = screen.getByRole('status')
    expect(el.getAttribute('width')).toBe('32')
    expect(el.getAttribute('height')).toBe('32')
  })

  it('defaults size to 16', () => {
    render(<Spinner />)
    const el = screen.getByRole('status')
    expect(el.getAttribute('width')).toBe('16')
  })

  it('forwards className', () => {
    render(<Spinner className="text-red-500" />)
    expect(screen.getByRole('status')).toHaveClass('text-red-500')
  })
})
