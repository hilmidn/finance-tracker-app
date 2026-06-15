import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Klik</Button>)
    expect(screen.getByText('Klik')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Klik</Button>)
    await user.click(screen.getByText('Klik'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders as <button> by default', () => {
    render(<Button>Tombol</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('applies primary variant styling by default', () => {
    render(<Button>Primary</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-indigo-600/)
  })

  it('applies secondary variant styling', () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-white/)
  })

  it('applies danger variant styling', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-red/)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards additional className', () => {
    render(<Button className="custom-class">Test</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('renders leftIcon when provided', () => {
    const Icon = () => <span data-testid="test-icon">★</span>
    render(<Button leftIcon={<Icon />}>Test</Button>)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('forwards ref', () => {
    const ref = { current: null }
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders full width when width="full"', () => {
    render(<Button width="full">Wide</Button>)
    expect(screen.getByRole('button').className).toMatch(/w-full/)
  })

  it('respects type="submit"', () => {
    render(<form><Button type="submit">Submit</Button></form>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('renders Spinner atom when loading', () => {
    render(<Button loading>Load</Button>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
