import { cn, formatPrice, generateOrderId } from '@/lib/utils'

describe('utils', () => {
  it('cn merges class names and resolves tailwind conflicts', () => {
    const classes = cn('px-2', 'px-4', 'text-black', false && 'hidden')
    expect(classes).toContain('px-4')
    expect(classes).not.toContain('px-2')
    expect(classes).toContain('text-black')
  })

  it('formatPrice returns a localized currency string', () => {
    const s = formatPrice(1234.5)
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
    // Should contain digits of the value
    expect(s).toMatch(/1|١/)
  })

  it('generateOrderId returns unique order ids with prefix', () => {
    const a = generateOrderId()
    const b = generateOrderId()
    expect(a).toMatch(/^ORDER-/)
    expect(b).toMatch(/^ORDER-/)
    expect(a).not.toBe(b)
  })
})
