import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Validate local path to prevent open redirect vulnerabilities
      const isLocalPath = next.startsWith('/') && !next.startsWith('//')
      const safeNext = isLocalPath ? next : '/dashboard'
      return NextResponse.redirect(`${origin}${safeNext}`)
    }

    console.error('[Auth Callback] Code exchange error:', error.message)
  } else {
    console.warn('[Auth Callback] No code provided in URL')
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
