import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings — Flow Media Deal Engine',
  description: 'Configure your Flow Media account and integrations.',
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
          System Configuration
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Settings
        </h1>
        <p className="text-slate-400 text-lg mt-2">
          Manage your account, preferences, and external tool integrations.
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-12 text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Settings Architecture Pending</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          The configuration panel is currently being ported from the legacy system.
        </p>
      </div>
    </div>
  )
}

