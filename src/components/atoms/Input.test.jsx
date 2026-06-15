import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Ketik" />)
    expect(screen.getByPlaceholderText('Ketik')).toBeInTheDocument()
  })

  it('calls onChange when typed in', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('respects the value prop', () => {
    render(<Input value="hello" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('forwards className', () => {
    render(<Input className="extra" />)
    expect(screen.getByRole('textbox')).toHaveClass('extra')
  })

  it('supports number type', () => {
    render(<Input type="number" />)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })
})
