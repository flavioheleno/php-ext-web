import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime } from '@/composables/useFormat'

describe('useFormat', () => {
  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "N/A" for null input', () => {
      expect(formatRelativeTime(null)).toBe('N/A')
    })

    it('returns "N/A" for undefined input', () => {
      expect(formatRelativeTime(undefined)).toBe('N/A')
    })

    it('returns "N/A" for empty string', () => {
      expect(formatRelativeTime('')).toBe('N/A')
    })

    it('returns "just now" for times less than a minute ago', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now')
    })

    it('returns minutes ago for times less than an hour ago', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      expect(formatRelativeTime(tenMinutesAgo)).toBe('10m ago')
    })

    it('returns hours ago for times less than a day ago', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(fiveHoursAgo)).toBe('5h ago')
    })

    it('returns days ago for times less than a week ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
    })

    it('returns formatted date for times more than a week ago', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(twoWeeksAgo)).toBe('Jan 1, 2024')
    })
  })
})
