import { describe, it, expect } from 'vitest'
import { genId } from '../genId'

describe('genId', () => {
  it('returns a non-empty string', () => {
    const id = genId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns a valid UUID v4 format', () => {
    const id = genId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('returns unique values on each call', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) ids.add(genId())
    expect(ids.size).toBe(100)
  })
})
