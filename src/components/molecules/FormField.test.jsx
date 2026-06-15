import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from './FormField'

describe('FormField', () => {
  it('renders label when provided', () => {
    render(<FormField label="Jumlah"><input /></FormField>)
    expect(screen.getByText('Jumlah')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<FormField label="Jumlah"><input placeholder="Ketik nominal" /></FormField>)
    expect(screen.getByPlaceholderText('Ketik nominal')).toBeInTheDocument()
  })

  it('shows asterisk when required', () => {
    render(<FormField label="Jumlah" required><input /></FormField>)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('does not show asterisk when not required', () => {
    render(<FormField label="Catatan"><input /></FormField>)
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('renders error message when error prop is set', () => {
    render(<FormField label="Jumlah" error="Wajib diisi"><input /></FormField>)
    expect(screen.getByText('Wajib diisi')).toBeInTheDocument()
  })

  it('does not render error when no error prop', () => {
    render(<FormField label="Jumlah"><input /></FormField>)
    expect(screen.queryByText('Wajib diisi')).not.toBeInTheDocument()
  })

  it('forwards className to wrapper', () => {
    const { container } = render(<FormField className="extra" label="X"><input /></FormField>)
    expect(container.firstChild).toHaveClass('extra')
  })
})
