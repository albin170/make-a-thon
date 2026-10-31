import { cn } from '@/lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span>{' '}
        of <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            'p-2 rounded-lg text-gray-500 hover:bg-gray-100',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg font-medium',
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            'p-2 rounded-lg text-gray-500 hover:bg-gray-100',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
