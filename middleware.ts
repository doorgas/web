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
    '/verify-otp',
    // Debug and testing routes - accessible without authentication
    '/debug/license-test',
    '/debug/connection-test',
    '/test-admin-connection'
  ]
  
  const publicApiRoutes = [
    '/api/auth/',
    '/api/email/',
    '/api/register',
    // Debug API routes - accessible without authentication
    '/api/debug/'
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
    '/favicon.ico',
    // Debug and testing routes - allow access without license verification
    '/debug/',
    '/test-admin-connection',
    '/api/debug/'
  ]
  
  return exemptRoutes.some(route => pathname.startsWith(route))
}

async function checkLicenseMiddleware(req: NextRequest): Promise<NextResponse | null> {
  try {
    // Get current domain - normalize it
    const currentDomain = (req.headers.get('host') || req.nextUrl.hostname).toLowerCase();
    
    console.log('Middleware license check by domain:', { currentDomain });
    
    // Check license by domain only (no local storage/cookies needed)
    const licenseResult = await checkLicenseByDomain(currentDomain);
    
    if (!licenseResult.valid) {
      console.log('No license found for domain, redirecting to setup');
      return NextResponse.redirect(new URL('/license-setup', req.url));
    }
    
    if (licenseResult.valid && !licenseResult.globallyVerified) {
      console.log('License found but not verified, redirecting to setup');
      return NextResponse.redirect(new URL('/license-setup', req.url));
    }
    
    if (licenseResult.valid && licenseResult.globallyVerified) {
      console.log('License check passed for domain:', currentDomain);
      // License is valid and verified, continue
      return null;
    }
    
    // Fallback - redirect to setup
    return NextResponse.redirect(new URL('/license-setup', req.url));
    
  } catch (error) {
    console.error('License check error in middleware:', error);
    
    // On error, redirect to license setup - DO NOT ALLOW ACCESS
    return NextResponse.redirect(new URL('/license-setup', req.url));
  }
}

// Helper function for domain-based license check in middleware
async function checkLicenseByDomain(domain: string): Promise<{valid: boolean, globallyVerified?: boolean, error?: string}> {
  try {
    // Use the new API endpoint that checks by domain
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/license/check-by-domain`;
    
    console.log('Checking license for domain in middleware:', domain);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: domain
      }),
    });
    
    if (!response.ok) {
      console.log('Domain license check failed with status:', response.status);
      return { valid: false, error: `No license found for domain` };
    }
    
    const data = await response.json();
    return {
      valid: data.valid === true,
      globallyVerified: data.globallyVerified === true,
      error: data.error
    };
  } catch (error) {
    console.error('Domain license check failed in middleware:', error);
    return { valid: false, error: 'Connection failed' };
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
