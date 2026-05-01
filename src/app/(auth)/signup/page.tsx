'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    try {
      await signup(email, password, name);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black mb-2">Create your Flo-Media account</h1>
          <p className="text-slate-600">Media Pipeline access</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="John Doe"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="••••••••"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full py-3 px-4 bg-brand-purple text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-purple font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
