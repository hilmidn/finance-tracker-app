import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterChip } from './FilterChip'

describe('FilterChip', () => {
  it('renders children', () => {
    render(<FilterChip>Makanan</FilterChip>)
    expect(screen.getByText('Makanan')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<FilterChip onClick={onClick}>X</FilterChip>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies selected styling when selected', () => {
    render(<FilterChip selected>Active</FilterChip>)
    expect(screen.getByRole('button').className).toMatch(/bg-indigo-600/)
  })

  it('applies unselected styling by default', () => {
    render(<FilterChip>Inactive</FilterChip>)
    expect(screen.getByRole('button').className).toMatch(/bg-white/)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<FilterChip disabled onClick={onClick}>X</FilterChip>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies disabled styling', () => {
    render(<FilterChip disabled>X</FilterChip>)
    expect(screen.getByRole('button').className).toMatch(/opacity-50/)
  })

  it('forwards className', () => {
    render(<FilterChip className="extra">X</FilterChip>)
    expect(screen.getByRole('button')).toHaveClass('extra')
  })
})
