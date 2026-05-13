import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team Management — Flow Media Deal Engine',
  description: 'Manage your team members and roles.',
}

export default function TeamPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
          Workspace
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Team Management
        </h1>
        <p className="text-slate-400 text-lg mt-2">
          Invite members, assign roles, and manage workspace access.
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-12 text-center">
        <div className="text-4xl mb-4">👨‍💼</div>
        <h2 className="text-xl font-semibold text-white mb-2">Team Architecture Pending</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          The workspace management module is currently being ported.
        </p>
      </div>
    </div>
  )
}

