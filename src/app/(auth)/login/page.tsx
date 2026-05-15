import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In — Flow Media Deal Engine',
  description: 'Sign in to your Flow Media account to access your AI media production engine.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4 relative">
      {/* Background glows */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.08),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <span className="text-white font-black text-lg">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Sign in to Flow Media</h1>
          <p className="text-slate-400 text-sm mt-1">Deal Engine access</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          <LoginForm />
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

