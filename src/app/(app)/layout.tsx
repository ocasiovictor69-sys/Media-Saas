import React, { ReactNode } from 'react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-black">FLO_MEDIA</h1>
          <p className="text-sm text-slate-500">The Visibility Engine</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2 rounded-lg bg-brand-purple text-white font-medium">
            Dashboard
          </Link>
          <Link href="/dashboard/productions" className="block px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Productions
          </Link>
          <Link href="/dashboard/library" className="block px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Asset Library
          </Link>
          <Link href="/dashboard/distribution" className="block px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Distribution
          </Link>
          <Link href="/dashboard/analytics" className="block px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Analytics
          </Link>
          <Link href="/dashboard/settings" className="block px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <Link href="/logout" className="block px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Navbar */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-black">Dashboard</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">User</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
