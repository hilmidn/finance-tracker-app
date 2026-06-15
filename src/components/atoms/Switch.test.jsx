import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renders with role="switch"', () => {
    render(<Switch />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('aria-checked reflects checked state', () => {
    const { rerender } = render(<Switch checked={false} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    rerender(<Switch checked={true} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('fires onChange with new value when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} disabled />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('applies disabled styling when disabled', () => {
    render(<Switch disabled />)
    expect(screen.getByRole('switch').className).toMatch(/opacity-50/)
  })

  it('forwards className', () => {
    render(<Switch className="extra" />)
    expect(screen.getByRole('switch')).toHaveClass('extra')
  })
})
