import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface CardProps {
  className?: string
  children: ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {children}
    </div>
  )
}

interface CardHeaderProps { title: string; subtitle?: string; action?: ReactNode }
export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardBody({ className, children }: CardProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label: string }
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',  value: 'text-blue-700'  },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', value: 'text-green-700' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', value: 'text-yellow-700' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',    value: 'text-red-700'   },
}

export function MetricCard({ title, value, subtitle, icon, trend, color = 'blue' }: MetricCardProps) {
  const colors = colorMap[color]
  return (
    <div className={cn('rounded-xl p-6 border border-gray-100 shadow-sm bg-white')}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={cn('mt-2 text-3xl font-bold', colors.value)}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('ml-4 flex-shrink-0 rounded-xl p-3', colors.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
