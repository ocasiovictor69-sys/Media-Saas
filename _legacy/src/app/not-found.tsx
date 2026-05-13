import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-brand-purple mb-4">404</div>
        <h1 className="text-3xl font-bold text-black mb-4">Page not found</h1>
        <p className="text-slate-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-3 rounded-full bg-brand-purple text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-full border border-slate-200 text-black font-semibold hover:bg-slate-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
