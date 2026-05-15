import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname.startsWith('/login') || 
                    pathname.startsWith('/signup') ||
                    pathname.startsWith('/forgot-password')
  
  const isProtectedPage = pathname.startsWith('/dashboard') ||
                         pathname.startsWith('/media') ||
                         pathname.startsWith('/scripts') ||
                         pathname.startsWith('/render') ||
                         pathname.startsWith('/distribute') ||
                         pathname.startsWith('/team') ||
                         pathname.startsWith('/settings')

  if (isProtectedPage && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
