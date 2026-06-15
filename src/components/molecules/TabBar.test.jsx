import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabBar } from './TabBar'

const TABS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', icon: <span data-testid="beta-icon">★</span> },
  { value: 'c', label: 'Gamma' },
]

describe('TabBar', () => {
  it('renders all tabs', () => {
    render(<TabBar tabs={TABS} value="a" onChange={() => {}} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('renders tab icon when provided', () => {
    render(<TabBar tabs={TABS} value="a" onChange={() => {}} />)
    expect(screen.getByTestId('beta-icon')).toBeInTheDocument()
  })

  it('calls onChange with tab value when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TabBar tabs={TABS} value="a" onChange={onChange} />)
    await user.click(screen.getByText('Beta'))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('highlights the active tab with shadow', () => {
    render(<TabBar tabs={TABS} value="b" onChange={() => {}} />)
    const activeBtn = screen.getByText('Beta').closest('button')
    expect(activeBtn.className).toMatch(/shadow-sm/)
  })

  it('forwards className to wrapper', () => {
    const { container } = render(
      <TabBar tabs={TABS} value="a" onChange={() => {}} className="extra" />
    )
    expect(container.firstChild).toHaveClass('extra')
  })
})
