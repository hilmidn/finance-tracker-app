import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthPicker } from './MonthPicker'

describe('MonthPicker', () => {
  it('renders the month label for given value', () => {
    render(<MonthPicker value="2026-01" onChange={() => {}} />)
    expect(screen.getByText(/Januari 2026/)).toBeInTheDocument()
  })

  it('calls onChange with previous month when back clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthPicker value="2026-03" onChange={onChange} />)
    await user.click(screen.getByLabelText('Bulan sebelumnya'))
    expect(onChange).toHaveBeenCalledWith('2026-02')
  })

  it('calls onChange with next month when forward clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthPicker value="2026-03" onChange={onChange} />)
    await user.click(screen.getByLabelText('Bulan berikutnya'))
    expect(onChange).toHaveBeenCalledWith('2026-04')
  })

  it('handles year wrap (December -> next January)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthPicker value="2026-12" onChange={onChange} />)
    await user.click(screen.getByLabelText('Bulan berikutnya'))
    expect(onChange).toHaveBeenCalledWith('2027-01')
  })

  it('handles year wrap (January -> previous December)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthPicker value="2026-01" onChange={onChange} />)
    await user.click(screen.getByLabelText('Bulan sebelumnya'))
    expect(onChange).toHaveBeenCalledWith('2025-12')
  })
})
