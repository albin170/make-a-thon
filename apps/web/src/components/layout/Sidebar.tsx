'use client'

import Link from 'next/link'
import { Navigation } from './Navigation'

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 fixed top-0 left-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">B</span>
        </div>
        <Link href="/dashboard" className="text-lg font-bold text-gray-900 tracking-tight">
          Brightloop
        </Link>
      </div>

      <Navigation />

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Brightloop SMS v1.0</p>
      </div>
    </aside>
  )
}
