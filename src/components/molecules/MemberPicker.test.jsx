import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberPicker } from './MemberPicker'

const MEMBERS = [
  { id: 'm1', user_id: 'uaaa111' },
  { id: 'm2', user_id: 'ubbb222' },
  { id: 'm3', user_id: 'uccc333' },
]

describe('MemberPicker', () => {
  it('renders a chip for each member', () => {
    render(<MemberPicker members={MEMBERS} currentUserId="uaaa111" />)
    expect(screen.getByText('Kamu')).toBeInTheDocument()
    expect(screen.getByText('User ubbb22')).toBeInTheDocument()
    expect(screen.getByText('User uccc33')).toBeInTheDocument()
  })

  it('highlights the selected member', () => {
    render(<MemberPicker members={MEMBERS} selectedId="ubbb222" currentUserId="uaaa111" />)
    const selectedChip = screen.getByText('User ubbb22')
    expect(selectedChip.className).toMatch(/bg-purple-600/)
  })

  it('calls onSelect with member user_id when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<MemberPicker members={MEMBERS} currentUserId="uaaa111" onSelect={onSelect} />)
    await user.click(screen.getByText('User ubbb22'))
    expect(onSelect).toHaveBeenCalledWith('ubbb222')
  })

  it('renders nothing when members is empty', () => {
    const { container } = render(<MemberPicker members={[]} currentUserId="u-aaa-111" />)
    expect(container.firstChild.children.length).toBe(0)
  })

  it('forwards className', () => {
    const { container } = render(
      <MemberPicker members={MEMBERS} currentUserId="u-aaa-111" className="extra" />
    )
    expect(container.firstChild).toHaveClass('extra')
  })
})
