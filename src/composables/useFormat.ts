import { formatTimeAgo, type UseTimeAgoMessages } from '@vueuse/core'

const messages: UseTimeAgoMessages = {
  justNow: 'just now', past: '{0} ago', future: 'in {0}', invalid: 'N/A',
  second: '{0}s', minute: '{0}m', hour: '{0}h', day: '{0}d', week: '{0}w', month: '{0}mo', year: '{0}y',
}

const fullDateFormatter = (date: Date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  // max: anything 7+ days old shows the full date
  return formatTimeAgo(new Date(dateString), { messages, fullDateFormatter, rounding: 'floor', max: 7 * 864e5 - 1 })
}

// Numeric version order with 'next' always last
export function comparePhpVersions(a: string, b: string): number {
  if (a === b) return 0
  if (a === 'next') return 1
  if (b === 'next') return -1
  return a.localeCompare(b, undefined, { numeric: true })
}
