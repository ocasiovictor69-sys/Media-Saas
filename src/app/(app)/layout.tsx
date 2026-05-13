import type { ReactNode } from 'react'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <Sidebar />

      {/* Main content — offset for fixed navbar + sidebar */}
      <main className="pt-[64px] md:pl-64 min-h-screen">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
