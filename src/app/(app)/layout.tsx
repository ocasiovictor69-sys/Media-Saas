'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[FloMedia ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px] px-8">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠</span>
            </div>
            <h2 className="text-lg font-bold text-black mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-4">{this.state.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 bg-brand-purple text-white rounded-lg text-sm font-medium hover:opacity-90"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function FloMediaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Productions', href: '/dashboard/productions', icon: '🎬' },
    { name: 'Asset Library', href: '/dashboard/library', icon: '📁' },
    { name: 'Distribution', href: '/dashboard/distribution', icon: '📡' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
    { name: 'Settings',  href: '/dashboard/settings',  icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none -z-10" />
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 bg-white border-r border-zinc-200 flex-col justify-between shadow-sm">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center text-white font-bold text-sm">
              Fl
            </div>
            <span className="text-xl font-bold text-zinc-900 tracking-tight">FLO-MEDIA</span>
          </Link>

          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href || 
                (link.href !== '/dashboard' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-purple text-white shadow-sm shadow-indigo-200'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
                >
                  <span className="text-lg">{link.icon}</span>
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-zinc-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email || 'admin@flomedia.ai'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 flex items-center px-8 z-10">
          <span className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Flow-Media Pipeline</span>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto bg-transparent pb-16 md:pb-0 z-10">
          <div className="p-6 md:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex items-center justify-around px-2 py-2">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-brand-purple' : 'text-zinc-500'
              }`}
            >
              <span className="text-xl leading-none">{link.icon}</span>
              <span className="text-[10px] font-semibold">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
