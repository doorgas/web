import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Check license verification first (except for license setup routes)
    if (!isLicenseExemptRoute(pathname)) {
      const licenseCheck = await checkLicenseMiddleware(req);
      if (licenseCheck) {
        return licenseCheck;
      }
    }

    // If user is not authenticated and trying to access protected routes
    if (!token && !isPublicRoute(pathname)) {
      return NextResponse.redirect(new URL('/register', req.url))
    }

    // If user is authenticated, allow access
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to public routes for everyone
        if (isPublicRoute(pathname)) {
          return true
        }
        
        // For all other routes, require authentication
        return !!token
      },
    },
    pages: {
      signIn: '/register',
    },
  }
)

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/register',
    '/verify-otp'
  ]
  
  const publicApiRoutes = [
    '/api/auth/',
    '/api/email/',
    '/api/register'
  ]
  
  // Check exact matches for pages
  if (publicRoutes.includes(pathname)) {
    return true
  }
  
  // Check API route prefixes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return true
  }
  
  return false
}

function isLicenseExemptRoute(pathname: string): boolean {
  const exemptRoutes = [
    '/license-setup',
    '/license-invalid',
    '/api/license/',
    '/api/auth/',
    '/_next/',
    '/favicon.ico'
  ]
  
  return exemptRoutes.some(route => pathname.startsWith(route))
}

async function checkLicenseMiddleware(req: NextRequest): Promise<NextResponse | null> {
  try {
    // Get license key from cookie or header
    let licenseKey = req.cookies.get('license_key')?.value;
    
    // If no license key in cookie, check if it's stored in localStorage (client-side)
    // For server-side, we'll need to redirect to setup if no license is found
    if (!licenseKey) {
      // Check environment variable as fallback for initial setup
      licenseKey = process.env.NEXT_PUBLIC_LICENSE_KEY;
    }
    
    if (!licenseKey) {
      return NextResponse.redirect(new URL('/license-setup', req.url));
    }
    
    // Get current domain
    const currentDomain = req.headers.get('host') || req.nextUrl.hostname;
    
    // Quick license verification (we'll implement a lightweight check)
    const licenseValid = await quickLicenseCheck(licenseKey, currentDomain);
    
    if (!licenseValid) {
      return NextResponse.redirect(new URL('/license-invalid', req.url));
    }
    
    // License is valid, continue
    return null;
  } catch (error) {
    console.error('License check error in middleware:', error);
    
    // In case of error, allow access but log the issue
    // You might want to redirect to an error page in production
    return null;
  }
}

async function quickLicenseCheck(licenseKey: string, domain: string): Promise<boolean> {
  try {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
    
    // Create a timeout promise to handle hanging requests
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 3000); // Reduced timeout
    });
    
    const fetchPromise = fetch(
      `${adminPanelUrl}/api/saas/verify-license?license=${encodeURIComponent(licenseKey)}&domain=${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      console.warn('License verification request failed:', response.status);
      // For domain authorization errors (403), return false immediately
      if (response.status === 403) {
        return false;
      }
      return false;
    }
    
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('License verification failed:', error);
    // In case of network error, return false to block access (strict mode)
    return false;
  }
}

export const config = {
  // Match all routes except static files and images
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
