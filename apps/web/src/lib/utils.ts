import { type ClassValue, clsx } from 'clsx'

// ─── CSS class helper ─────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── Dates ────────────────────────────────────────────────────────────────────
export function formatDate(dateStr: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const day   = d.getDate()
    const month = months[d.getMonth()]
    const year  = d.getFullYear()
    if (fmt === 'MMM d, yyyy') return `${month} ${day}, ${year}`
    if (fmt === 'yyyy-MM-dd') return d.toISOString().split('T')[0]
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export function truncate(str: string, n = 40): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active:    'bg-green-100 text-green-800',
    paid:      'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    accepted:  'bg-green-100 text-green-800',
    inactive:  'bg-gray-100 text-gray-600',
    draft:     'bg-gray-100 text-gray-600',
    void:      'bg-gray-100 text-gray-600',
    archived:  'bg-gray-100 text-gray-600',
    pending:   'bg-yellow-100 text-yellow-800',
    trialing:  'bg-blue-100 text-blue-800',
    open:      'bg-blue-100 text-blue-800',
    sent:      'bg-blue-100 text-blue-800',
    running:   'bg-blue-100 text-blue-800',
    paused:    'bg-orange-100 text-orange-800',
    suspended: 'bg-orange-100 text-orange-800',
    overdue:   'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
    failed:    'bg-red-100 text-red-800',
    expired:   'bg-red-100 text-red-800',
    rejected:  'bg-red-100 text-red-800',
    refunded:  'bg-purple-100 text-purple-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
