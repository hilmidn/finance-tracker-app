import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders first 2 chars of seed uppercase', () => {
    render(<Avatar seed="hilmidn" />)
    expect(screen.getByText('HI')).toBeInTheDocument()
  })

  it('renders ? when seed is empty', () => {
    render(<Avatar seed="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('applies indigo color by default', () => {
    render(<Avatar seed="x" />)
    expect(screen.getByText('X').className).toMatch(/bg-indigo-100/)
  })

  it('applies amber color', () => {
    render(<Avatar seed="x" color="amber" />)
    expect(screen.getByText('X').className).toMatch(/bg-amber-100/)
  })

  it('applies purple color', () => {
    render(<Avatar seed="x" color="purple" />)
    expect(screen.getByText('X').className).toMatch(/bg-purple-100/)
  })

  it('forwards className', () => {
    render(<Avatar seed="x" className="extra" />)
    expect(screen.getByText('X')).toHaveClass('extra')
  })

  it('uses larger size by default', () => {
    render(<Avatar seed="x" />)
    expect(screen.getByText('X').className).toMatch(/w-9/)
  })

  it('uses sm size when specified', () => {
    render(<Avatar seed="x" size="sm" />)
    expect(screen.getByText('X').className).toMatch(/w-7/)
  })
})
