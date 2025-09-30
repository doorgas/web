import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple in-memory cache for license checks to prevent flashing
const licenseCache = new Map<string, { 
  result: { valid: boolean; globallyVerified?: boolean; error?: string; },
  timestamp: number,
  ttl: number
}>();

// Cache TTL: 24 hours for valid licenses, 5 minutes for invalid
const CACHE_TTL_VALID = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_TTL_INVALID = 5 * 60 * 1000; // 5 minutes

// Request deduplication - prevent multiple simultaneous calls for the same domain
const pendingRequests = new Map<string, Promise<{valid: boolean, globallyVerified?: boolean, error?: string}>>();

// Track 24-hour license sessions - persistent across page navigation
const licenseSessionKey = 'domain_license_session';
const LICENSE_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper functions for license session management
function getLicenseSession(domain: string): { verified: boolean; expiresAt: number } | null {
  // Check server-side in-memory store
  return licenseSessionsStore.get(domain) || null;
}

function setLicenseSession(domain: string, verified: boolean): void {
  const expiresAt = Date.now() + LICENSE_SESSION_DURATION;
  licenseSessionsStore.set(domain, { verified, expiresAt });
  
  // Clean up expired sessions periodically
  cleanupExpiredSessions();
}

function isLicenseSessionValid(domain: string): boolean {
  const session = getLicenseSession(domain);
  if (!session) return false;
  
  const now = Date.now();
  if (now > session.expiresAt) {
    // Session expired, remove it
    licenseSessionsStore.delete(domain);
    return false;
  }
  
  return session.verified;
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [domain, session] of licenseSessionsStore.entries()) {
    if (now > session.expiresAt) {
      licenseSessionsStore.delete(domain);
    }
  }
}

// In-memory store for license sessions (in production, use Redis or similar)
const licenseSessionsStore = new Map<string, { verified: boolean; expiresAt: number }>();

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
    
    console.log('Middleware license check by domain:', { currentDomain, pathname: req.nextUrl.pathname });
    
    // Prevent redirect loops - if already on license-setup, be more lenient
    const isOnLicenseSetup = req.nextUrl.pathname === '/license-setup';
    
    // Check if we have a valid 24-hour license session
    if (isLicenseSessionValid(currentDomain)) {
      console.log('Valid 24-hour license session found, allowing access');
      return null; // Allow access for the full 24 hours
    }
    
    // Check cache first to avoid expensive API calls
    const cachedResult = getCachedLicenseResult(currentDomain);
    if (cachedResult) {
      console.log('Using cached license result for domain:', currentDomain);
      
      // If license is valid, create/update 24-hour session
      if (cachedResult.valid && cachedResult.globallyVerified) {
        setLicenseSession(currentDomain, true);
        console.log('Created 24-hour license session for domain:', currentDomain);
        return null; // Allow access
      }
      
      return handleLicenseResult(cachedResult, isOnLicenseSetup, req, true);
    }
    
    // No valid session and no cache - need to check license
    // Check if there's already a pending request for this domain
    let licenseResult;
    if (pendingRequests.has(currentDomain)) {
      console.log('Using pending request for domain:', currentDomain);
      licenseResult = await pendingRequests.get(currentDomain)!;
    } else {
      // Create new request and cache it
      const requestPromise = checkLicenseByDomain(currentDomain);
      pendingRequests.set(currentDomain, requestPromise);
      
      try {
        licenseResult = await requestPromise;
        // Cache the result
        setCachedLicenseResult(currentDomain, licenseResult);
      } finally {
        // Clean up pending request
        pendingRequests.delete(currentDomain);
      }
    }
    
    // If license is valid, create 24-hour session
    if (licenseResult.valid && licenseResult.globallyVerified) {
      setLicenseSession(currentDomain, true);
      console.log('License verified, created 24-hour session for domain:', currentDomain);
      return null; // Allow access
    }
    
    return handleLicenseResult(licenseResult, isOnLicenseSetup, req, false);
    
  } catch (error) {
    console.error('License check error in middleware:', error);
    
    // Get current domain for error handling
    const currentDomain = (req.headers.get('host') || req.nextUrl.hostname).toLowerCase();
    
    // On error, check if we have a valid session before redirecting
    if (isLicenseSessionValid(currentDomain)) {
      console.log('Error during license check, but valid session exists - allowing access');
      return null;
    }
    
    // On error, only redirect if not already on license-setup
    const isOnLicenseSetup = req.nextUrl.pathname === '/license-setup';
    if (!isOnLicenseSetup) {
      return NextResponse.redirect(new URL('/license-setup', req.url));
    }
    
    return null;
  }
}

function getCachedLicenseResult(domain: string): { valid: boolean; globallyVerified?: boolean; error?: string; } | null {
  const cached = licenseCache.get(domain);
  if (!cached) return null;
  
  const now = Date.now();
  if (now > cached.timestamp + cached.ttl) {
    // Cache expired
    licenseCache.delete(domain);
    return null;
  }
  
  return cached.result;
}

function setCachedLicenseResult(domain: string, result: { valid: boolean; globallyVerified?: boolean; error?: string; }) {
  const ttl = (result.valid && result.globallyVerified) ? CACHE_TTL_VALID : CACHE_TTL_INVALID;
  licenseCache.set(domain, {
    result,
    timestamp: Date.now(),
    ttl
  });
}


function handleLicenseResult(
  licenseResult: { valid: boolean; globallyVerified?: boolean; error?: string; },
  isOnLicenseSetup: boolean,
  req: NextRequest,
  allowGracefulDegradation: boolean = false
): NextResponse | null {
  if (!licenseResult.valid) {
    if (isOnLicenseSetup || allowGracefulDegradation) {
      // Already on license setup page or allowing graceful degradation, don't redirect again
      console.log('Allowing access despite invalid license (setup page or graceful degradation)');
      return null;
    }
    console.log('No license found for domain, redirecting to setup');
    return NextResponse.redirect(new URL('/license-setup', req.url));
  }
  
  if (licenseResult.valid && !licenseResult.globallyVerified) {
    if (isOnLicenseSetup || allowGracefulDegradation) {
      // Already on license setup page or allowing graceful degradation, allow them to complete the setup
      console.log('Allowing access to complete verification (setup page or graceful degradation)');
      return null;
    }
    console.log('License found but not verified, redirecting to setup');
    return NextResponse.redirect(new URL('/license-setup', req.url));
  }
  
  if (licenseResult.valid && licenseResult.globallyVerified) {
    console.log('License check passed for domain');
    // License is valid and verified, continue
    return null;
  }
  
  // Fallback - only redirect if not already on license-setup and not allowing graceful degradation
  if (!isOnLicenseSetup && !allowGracefulDegradation) {
    return NextResponse.redirect(new URL('/license-setup', req.url));
  }
  
  return null;
}

// Helper function for domain-based license check in middleware with timeout
async function checkLicenseByDomain(domain: string): Promise<{valid: boolean, globallyVerified?: boolean, error?: string}> {
  try {
    // Use the new API endpoint that checks by domain
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/license/check-by-domain`;
    
    console.log('Checking license for domain in middleware:', domain);
    
    // Add timeout to prevent long waits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domain
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('Domain license check failed in middleware:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, error: 'License check timeout' };
    }
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
