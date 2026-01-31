import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple in-memory cache for license checks to prevent flashing
const licenseCache = new Map<string, { 
  result: { valid: boolean; globallyVerified?: boolean; error?: string; },
  timestamp: number,
  ttl: number
}>();

// Cache TTL: 30 seconds for valid licenses, 5 seconds for invalid
const CACHE_TTL_VALID = 30 * 1000;
const CACHE_TTL_INVALID = 5 * 1000;

// Request deduplication - prevent multiple simultaneous calls for the same domain
const pendingRequests = new Map<string, Promise<{valid: boolean, globallyVerified?: boolean, error?: string}>>();

// Track navigation sessions to provide grace period
const navigationSessions = new Map<string, { firstAccess: number, allowedUntil: number }>();
const NAVIGATION_GRACE_PERIOD = 10 * 1000; // 10 seconds grace period for navigation

// Cookie-based session persistence for page refreshes
const LICENSE_SESSION_COOKIE = 'license_session';
const PERSISTENT_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes for persistent sessions

// Browser and device detection
function isMobile(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

function isiOS(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

function isSafari(userAgent: string): boolean {
  return userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Chromium');
}

// Mobile browsers need much longer grace periods due to different behaviors
function getGracePeriodForBrowser(userAgent: string): number {
  if (isMobile(userAgent)) {
    return 60 * 1000; // 60 seconds for mobile browsers (much longer)
  }
  if (isSafari(userAgent)) {
    return 30 * 1000; // 30 seconds for desktop Safari
  }
  return NAVIGATION_GRACE_PERIOD; // 10 seconds for other desktop browsers
}

// Check if we should skip license checks entirely for this browser/device
function shouldSkipLicenseCheckForBrowser(userAgent: string): boolean {
  // For mobile browsers, be very conservative and skip checks for longer periods
  return isMobile(userAgent) || isiOS(userAgent);
}

// Cookie-based persistent session management
function getPersistentLicenseSession(req: NextRequest, domain: string): { verified: boolean; expiresAt: number } | null {
  try {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const sessionCookie = cookies[LICENSE_SESSION_COOKIE];
    if (!sessionCookie) return null;
    
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    
    // Verify the session is for this domain and still valid
    if (sessionData.domain === domain && sessionData.expiresAt > Date.now()) {
      return {
        verified: sessionData.verified,
        expiresAt: sessionData.expiresAt
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error reading persistent license session:', error);
    return null;
  }
}

function createPersistentLicenseSession(domain: string): string {
  const sessionData = {
    domain: domain,
    verified: true,
    expiresAt: Date.now() + PERSISTENT_SESSION_DURATION,
    timestamp: Date.now()
  };
  
  return encodeURIComponent(JSON.stringify(sessionData));
}

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Remove debug logs now that issue is fixed

    // ABSOLUTE FIRST: Check authentication - ZERO license logic for unauthenticated users
    if (!token) {
      // If it's a public route, allow access immediately
      if (isPublicRoute(pathname)) {
        return NextResponse.next();
      }
      
      // If it's a protected route, redirect to register immediately
      return NextResponse.redirect(new URL('/register', req.url));
    }

    // User is authenticated - proceed with license checks
    if (!isLicenseExemptRoute(pathname)) {
      const licenseCheck = await checkLicenseMiddleware(req);
      if (licenseCheck) {
        return licenseCheck;
      }
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always return true - let our custom middleware handle all the logic
        // This prevents NextAuth from doing its own redirects that might interfere
        return true;
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
    '/license-setup',
    '/license-invalid',
    // Debug and testing routes - accessible without authentication
    '/debug/license-test',
    '/debug/connection-test',
    '/test-admin-connection'
  ]
  
  const publicApiRoutes = [
    '/api/auth/',
    '/api/email/',
    '/api/register',
    '/api/license/',
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
    const userAgent = req.headers.get('user-agent') || '';
    const browserGracePeriod = getGracePeriodForBrowser(userAgent);
    const isMobileBrowser = isMobile(userAgent);
    const isIOSDevice = isiOS(userAgent);
    
    console.log('Middleware license check by domain:', { 
      currentDomain, 
      pathname: req.nextUrl.pathname,
      isMobile: isMobileBrowser,
      isIOS: isIOSDevice,
      isSafari: isSafari(userAgent),
      gracePeriod: browserGracePeriod
    });
    
    // Prevent redirect loops - if already on license-setup, be more lenient
    const isOnLicenseSetup = req.nextUrl.pathname === '/license-setup';
    
    // FIRST: Check for persistent license session (survives page refreshes)
    const persistentSession = getPersistentLicenseSession(req, currentDomain);
    if (persistentSession && persistentSession.verified && persistentSession.expiresAt > Date.now()) {
      console.log('Valid persistent license session found, allowing access (page refresh safe)');
      return null; // Allow access based on persistent session
    }
    
    // For mobile browsers and iOS, be VERY conservative - always allow access initially
    if (isMobileBrowser || isIOSDevice) {
      const sessionKey = currentDomain + '_mobile';
      const session = navigationSessions.get(sessionKey);
      const now = Date.now();
      
      // Check if we have a long-term mobile session
      if (session && now < session.allowedUntil) {
        console.log('Mobile device within extended grace period, allowing access');
        return null;
      }
      
      // Create or extend mobile session - very long duration
      if (!session || now >= session.allowedUntil) {
        console.log('Creating extended mobile session for navigation');
        navigationSessions.set(sessionKey, {
          firstAccess: session?.firstAccess || now,
          allowedUntil: now + browserGracePeriod // 60 seconds for mobile
        });
        
        // Start very delayed background check for mobile
        setTimeout(() => {
          console.log('Starting delayed background license check for mobile');
          checkLicenseInBackground(currentDomain);
        }, 2000); // 2 second delay for mobile
        
        return null; // Always allow access for mobile initially
      }
    }
    
    // Desktop browser logic (original logic but more conservative)
    const sessionKey = currentDomain;
    const session = navigationSessions.get(sessionKey);
    const now = Date.now();
    
    if (session && now < session.allowedUntil) {
      console.log('Within navigation grace period, allowing access');
      return null; // Allow access during grace period
    }
    
    // Check cache first to avoid expensive API calls
    const cachedResult = getCachedLicenseResult(currentDomain);
    if (cachedResult) {
      console.log('Using cached license result for domain:', currentDomain);
      
      // If license is valid, update/create navigation session AND set persistent cookie
      if (cachedResult.valid && cachedResult.globallyVerified) {
        navigationSessions.set(sessionKey, {
          firstAccess: session?.firstAccess || now,
          allowedUntil: now + browserGracePeriod
        });
        
        // Create persistent session for page refreshes
        const cookieValue = createPersistentLicenseSession(currentDomain);
        const response = NextResponse.next();
        response.cookies.set(LICENSE_SESSION_COOKIE, cookieValue, {
          maxAge: PERSISTENT_SESSION_DURATION / 1000, // 30 minutes
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        return response;
      }
      
      return handleLicenseResult(cachedResult, isOnLicenseSetup, req, true);
    }
    
    // If no cache and no grace period, start a grace period for new sessions
    if (!session) {
      console.log('Starting navigation grace period for new desktop session');
      navigationSessions.set(sessionKey, {
        firstAccess: now,
        allowedUntil: now + browserGracePeriod
      });
      
      // For Safari desktop, be conservative
      if (isSafari(userAgent)) {
        console.log('Desktop Safari detected: allowing immediate access');
        setTimeout(() => checkLicenseInBackground(currentDomain), 500);
        return null;
      }
      
      // Start background license check but don't wait for it
      checkLicenseInBackground(currentDomain);
      
      // Allow access during initial grace period
      return null;
    }
    
    // Grace period expired for desktop, need to check license
    // But still be very conservative about redirecting
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
    
    // If license is valid, extend the grace period AND set persistent cookie
    if (licenseResult.valid && licenseResult.globallyVerified) {
      navigationSessions.set(sessionKey, {
        firstAccess: session?.firstAccess || now,
        allowedUntil: now + browserGracePeriod
      });
      
      // Create persistent session for page refreshes
      const cookieValue = createPersistentLicenseSession(currentDomain);
      const response = NextResponse.next();
      response.cookies.set(LICENSE_SESSION_COOKIE, cookieValue, {
        maxAge: PERSISTENT_SESSION_DURATION / 1000, // 30 minutes
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return response;
    }
    
    return handleLicenseResult(licenseResult, isOnLicenseSetup, req, false);
    
  } catch (error) {
    console.error('License check error in middleware:', error);
    
    // Get current domain and user agent for error handling
    const currentDomain = (req.headers.get('host') || req.nextUrl.hostname).toLowerCase();
    const userAgent = req.headers.get('user-agent') || '';
    
    // For mobile/iOS, NEVER redirect on error - always allow access
    if (isMobile(userAgent) || isiOS(userAgent)) {
      console.log('Mobile device error handling: allowing access');
      return null;
    }
    
    // On error, only redirect if not already on license-setup and not in grace period
    const isOnLicenseSetup = req.nextUrl.pathname === '/license-setup';
    const session = navigationSessions.get(currentDomain);
    const inGracePeriod = session && Date.now() < session.allowedUntil;
    
    if (!isOnLicenseSetup && !inGracePeriod) {
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

// Background license check that doesn't block navigation
async function checkLicenseInBackground(domain: string) {
  try {
    console.log('Starting background license check for:', domain);
    const result = await checkLicenseByDomain(domain);
    setCachedLicenseResult(domain, result);
    console.log('Background license check completed for:', domain);
  } catch (error) {
    console.error('Background license check failed for:', domain, error);
  }
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
          // Safari-specific headers to prevent aggressive caching
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          domain: domain,
          timestamp: Date.now() // Add timestamp to prevent Safari caching
        }),
        signal: controller.signal,
        // Safari-specific cache prevention
        cache: 'no-store'
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
