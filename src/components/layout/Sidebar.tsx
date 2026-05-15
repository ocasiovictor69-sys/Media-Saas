'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/media', label: 'Asset Library', icon: '🎬' },
  { href: '/render', label: 'Render Queue', icon: '⚙️' },
  { href: '/approvals', label: 'Approvals', icon: '✅' },
  { href: '/team', label: 'Team', icon: '👨‍💼' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-[64px] bottom-0 w-64 bg-[#020617] border-r border-white/5 flex-col pt-6 z-20">
      <div className="px-4 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Main Menu</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          id="sidebar-upgrade"
          className="w-full bg-gradient-to-r from-indigo-600/20 to-violet-600/20 hover:from-indigo-600/40 hover:to-violet-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition-all mb-3"
        >
          Upgrade to Pro
        </button>
        <button
          id="sidebar-logout"
          onClick={handleLogout}
          className="w-full text-slate-500 hover:text-red-400 text-xs font-medium py-2 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
