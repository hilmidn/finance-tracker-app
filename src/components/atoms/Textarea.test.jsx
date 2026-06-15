import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Catatan" />)
    expect(screen.getByPlaceholderText('Catatan')).toBeInTheDocument()
  })

  it('calls onChange when typed in', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Textarea onChange={onChange} />)
    await user.type(screen.getByRole('textbox'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('respects the value prop', () => {
    render(<Textarea value="hello" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('uses default rows of 3', () => {
    render(<Textarea />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '3')
  })

  it('respects custom rows', () => {
    render(<Textarea rows={6} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6')
  })

  it('forwards className', () => {
    render(<Textarea className="extra" />)
    expect(screen.getByRole('textbox')).toHaveClass('extra')
  })
})
