export function useRelativeTime() {
  function formatRelative(date: string | Date): string {
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
    const diff = (new Date(date).getTime() - Date.now()) / 1000
    const absDiff = Math.abs(diff)
    if (absDiff < 60) return rtf.format(Math.round(diff), 'second')
    if (absDiff < 3600) return rtf.format(Math.round(diff / 60), 'minute')
    if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
    if (absDiff < 604800) return rtf.format(Math.round(diff / 86400), 'day')
    if (absDiff < 2592000) return rtf.format(Math.round(diff / 604800), 'week')
    return rtf.format(Math.round(diff / 2592000), 'month')
  }
  return { formatRelative }
}
