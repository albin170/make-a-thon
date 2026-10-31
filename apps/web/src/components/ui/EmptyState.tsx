import { ReactNode } from 'react'
import { InboxIcon } from '@heroicons/react/24/outline'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title = 'No results', description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-4">
        {icon ?? <InboxIcon className="h-12 w-12" />}
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
