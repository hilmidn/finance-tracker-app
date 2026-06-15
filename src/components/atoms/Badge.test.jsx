import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Masuk</Badge>)
    expect(screen.getByText('Masuk')).toBeInTheDocument()
  })

  it('applies green color', () => {
    render(<Badge color="green">Income</Badge>)
    expect(screen.getByText('Income').className).toMatch(/bg-green-50/)
  })

  it('applies red color', () => {
    render(<Badge color="red">Expense</Badge>)
    expect(screen.getByText('Expense').className).toMatch(/bg-red-50/)
  })

  it('applies purple color', () => {
    render(<Badge color="purple">Shared</Badge>)
    expect(screen.getByText('Shared').className).toMatch(/bg-purple-50/)
  })

  it('forwards className', () => {
    render(<Badge className="extra">X</Badge>)
    expect(screen.getByText('X')).toHaveClass('extra')
  })

  it('supports xs size by default', () => {
    render(<Badge>Small</Badge>)
    expect(screen.getByText('Small').className).toMatch(/text-\[10px\]/)
  })
})
