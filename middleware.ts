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
    // Get license key from cookie or header
    let licenseKey = req.cookies.get('license_key')?.value;
    
    // If no license key in cookie, check if it's stored in localStorage (client-side)
    // For server-side, we'll need to redirect to setup if no license is found
    if (!licenseKey) {
      // Check environment variable as fallback for initial setup
      licenseKey = process.env.NEXT_PUBLIC_LICENSE_KEY;
    }
    
    if (!licenseKey) {
      console.log('No license key found, redirecting to setup');
      return NextResponse.redirect(new URL('/license-setup', req.url));
    }
    
    // Get current domain - normalize it
    const currentDomain = (req.headers.get('host') || req.nextUrl.hostname).toLowerCase();
    
    console.log('Middleware license check:', { licenseKey: licenseKey.substring(0, 10) + '...', currentDomain });
    
    // Strict license verification - must pass to continue
    const licenseResult = await strictLicenseCheck(licenseKey, currentDomain);
    
    if (!licenseResult.valid) {
      console.log('License check failed:', licenseResult.error);
      
      // Special handling for deleted clients - immediate redirect to setup
      const isDeletedClient = licenseResult.error?.includes('Invalid license key') || 
                             licenseResult.error?.includes('License key not found');
      
      // Clear invalid license key from cookie
      const redirectUrl = isDeletedClient ? '/license-setup' : '/license-invalid';
      const response = NextResponse.redirect(new URL(redirectUrl, req.url));
      response.cookies.delete('license_key');
      
      // Add header to indicate deleted client for client-side handling
      if (isDeletedClient) {
        response.headers.set('X-License-Status', 'deleted');
      }
      
      return response;
    }
    
    console.log('License check passed');
    // License is valid, continue
    return null;
  } catch (error) {
    console.error('License check error in middleware:', error);
    
    // On error, redirect to license setup - DO NOT ALLOW ACCESS
    const response = NextResponse.redirect(new URL('/license-setup', req.url));
    response.cookies.delete('license_key');
    
    return response;
  }
}

async function strictLicenseCheck(licenseKey: string, domain: string): Promise<{valid: boolean, error?: string}> {
  try {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
    const url = `${adminPanelUrl}/api/saas/verify-license`;
    
    console.log('Making license verification request to:', url);
    
    // Create a timeout promise to handle hanging requests
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('License server timeout')), 5000);
    });
    
    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey,
        domain
      }),
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    console.log('License verification response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Response might not be JSON
      }
      
      return {
        valid: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    console.log('License verification result:', { valid: data.valid, hasClient: !!data.client });
    
    return {
      valid: data.valid === true,
      error: data.error
    };
  } catch (error) {
    console.error('License verification failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    
    return {
      valid: false,
      error: `Connection failed: ${errorMessage}`
    };
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
