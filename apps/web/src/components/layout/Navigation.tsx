'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  HomeIcon,
  UsersIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

export const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',     icon: HomeIcon },
  { href: '/customers',     label: 'Customers',     icon: UsersIcon },
  { href: '/products',      label: 'Products',      icon: CubeIcon },
  { href: '/plans',         label: 'Plans',         icon: TagIcon },
  { href: '/quotations',    label: 'Quotations',    icon: ClipboardDocumentListIcon },
  { href: '/subscriptions', label: 'Subscriptions', icon: ArrowPathIcon },
  { href: '/invoices',      label: 'Invoices',      icon: DocumentTextIcon },
  { href: '/payments',      label: 'Payments',      icon: CreditCardIcon },
  { href: '/billing',       label: 'Billing',       icon: BanknotesIcon },
  { href: '/reports',       label: 'Reports',       icon: ChartBarIcon },
  { href: '/users',         label: 'Users',         icon: UserGroupIcon },
  { href: '/settings',      label: 'Settings',      icon: Cog6ToothIcon },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
