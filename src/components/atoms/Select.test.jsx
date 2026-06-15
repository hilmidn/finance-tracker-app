import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const OPTIONS = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('Select', () => {
  it('renders options', () => {
    render(<Select options={OPTIONS} />)
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('selects initial value', () => {
    render(<Select options={OPTIONS} value="b" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('b')
  })

  it('calls onChange when option picked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select options={OPTIONS} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders placeholder option when provided', () => {
    render(<Select options={OPTIONS} placeholder="Pilih..." />)
    expect(screen.getByText('Pilih...')).toBeInTheDocument()
  })

  it('forwards className', () => {
    render(<Select options={OPTIONS} className="extra" />)
    expect(screen.getByRole('combobox')).toHaveClass('extra')
  })
})
