// License verification utility functions
export interface LicenseVerificationResponse {
  valid: boolean;
  error?: string;
  globallyVerified?: boolean; // New field to indicate if license is globally verified
  client?: {
    id: string;
    companyName: string;
    subscriptionType: string;
    subscriptionEndDate: string | null;
  };
}

export interface LicenseStatus {
  isValid: boolean;
  licenseKey: string | null;
  lastVerified: number | null;
  error: string | null;
  gracePeriodExpiry: number | null;
}

// Configuration
const LICENSE_CONFIG = {
  ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || 'http://localhost:3000',
  VERIFICATION_ENDPOINT: '/api/saas/verify-license',
  CHECK_ENDPOINT: '/api/saas/verify-license',
  VERIFICATION_INTERVAL: 5 * 1000, // 5 seconds - very strict for faster detection
  GRACE_PERIOD: 10 * 1000, // 10 seconds grace period - minimal for deleted clients
  STORAGE_KEY: 'saas_license_status',
};

// Get current domain
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  
  // For server-side, get from environment or headers
  return process.env.NEXT_PUBLIC_DOMAIN || 'localhost';
}

// Strict domain validation - must be exact match
export function validateDomainMatch(licensedDomain: string, currentDomain: string): boolean {
  // Normalize domains to lowercase
  const licensed = licensedDomain.toLowerCase().trim();
  const current = currentDomain.toLowerCase().trim();
  
  // Must be exact match - no subdomain allowance
  return licensed === current;
}

// Get stored license status from localStorage
export function getStoredLicenseStatus(): LicenseStatus | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(LICENSE_CONFIG.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Store license status to localStorage
export function storeLicenseStatus(status: LicenseStatus): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LICENSE_CONFIG.STORAGE_KEY, JSON.stringify(status));
  } catch (error) {
    console.warn('Failed to store license status:', error);
  }
}

// Verify license with admin panel
export async function verifyLicense(licenseKey: string, domain?: string): Promise<LicenseVerificationResponse> {
  const currentDomain = domain || getCurrentDomain();
  const url = `${LICENSE_CONFIG.ADMIN_PANEL_URL}${LICENSE_CONFIG.VERIFICATION_ENDPOINT}`;
  
  console.log('Attempting license verification:', { url, currentDomain, licenseKey: licenseKey.substring(0, 10) + '...' });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey,
        domain: currentDomain
      }),
    });

    if (!response.ok) {
      console.error('License verification failed with status:', response.status);
      
      let errorMessage = `License server responded with status ${response.status}`;
      
      // Handle specific error cases
      if (response.status === 405) {
        errorMessage = 'License server API endpoint not properly configured (Method Not Allowed)';
      } else if (response.status === 404) {
        errorMessage = 'License server API endpoint not found';
      } else if (response.status === 403) {
        errorMessage = 'Domain not authorized for this license';
      } else if (response.status === 401) {
        errorMessage = 'Invalid license key';
      } else if (response.status >= 500) {
        errorMessage = 'License server internal error';
      }
      
      // Try to get detailed error from response
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Response might not be JSON
      }
      
      return {
        valid: false,
        error: errorMessage
      };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('License server returned non-JSON response');
      const text = await response.text();
      console.error('Response text:', text.substring(0, 200));
      return {
        valid: false,
        error: 'License server returned invalid response format'
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('License verification error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return {
      valid: false,
      error: `Failed to connect to license server: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Quick license check (lighter version)
export async function checkLicenseStatus(licenseKey: string, domain?: string): Promise<LicenseVerificationResponse> {
  const currentDomain = domain || getCurrentDomain();
  const url = `${LICENSE_CONFIG.ADMIN_PANEL_URL}${LICENSE_CONFIG.CHECK_ENDPOINT}?license=${encodeURIComponent(licenseKey)}&domain=${encodeURIComponent(currentDomain)}`;
  
  console.log('Attempting license status check:', { url, currentDomain });
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      console.error('License check failed with status:', response.status);
      return {
        valid: false,
        error: `License server responded with status ${response.status}`
      };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('License server returned non-JSON response');
      return {
        valid: false,
        error: 'License server returned invalid response format'
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('License check error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return {
      valid: false,
      error: `Failed to connect to license server: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Check if license verification is needed
export function needsVerification(lastVerified: number | null): boolean {
  if (!lastVerified) return true;
  
  const now = Date.now();
  const timeSinceVerification = now - lastVerified;
  
  return timeSinceVerification > LICENSE_CONFIG.VERIFICATION_INTERVAL;
}

// Check if we're in grace period
export function isInGracePeriod(gracePeriodExpiry: number | null): boolean {
  if (!gracePeriodExpiry) return false;
  
  return Date.now() < gracePeriodExpiry;
}

// Update license status after verification
export async function updateLicenseStatus(licenseKey: string): Promise<LicenseStatus> {
  const verificationResult = await verifyLicense(licenseKey);
  const now = Date.now();
  
  // Special handling for deleted clients - NO grace period for "Invalid license key"
  const isDeletedClient = verificationResult.error?.includes('Invalid license key') || 
                          verificationResult.error?.includes('License key not found');
  
  const status: LicenseStatus = {
    isValid: verificationResult.valid,
    licenseKey,
    lastVerified: now,
    error: verificationResult.error || null,
    // No grace period for deleted clients, minimal grace for other errors
    gracePeriodExpiry: verificationResult.valid ? null : 
                      isDeletedClient ? null : now + LICENSE_CONFIG.GRACE_PERIOD
  };
  
  storeLicenseStatus(status);
  return status;
}

// Get license key from environment or storage
export function getLicenseKey(): string | null {
  // Try environment variable first (for initial setup)
  const envLicense = process.env.NEXT_PUBLIC_LICENSE_KEY;
  if (envLicense) return envLicense;
  
  // Try cookie (for middleware)
  if (typeof document !== 'undefined') {
    const cookieMatch = document.cookie.match(/license_key=([^;]+)/);
    if (cookieMatch) return cookieMatch[1];
  }
  
  // Try localStorage
  const stored = getStoredLicenseStatus();
  return stored?.licenseKey || null;
}

// Check global license status from admin database
export async function checkGlobalLicenseStatus(licenseKey: string, domain?: string): Promise<LicenseVerificationResponse> {
  const currentDomain = domain || getCurrentDomain();
  
  try {
    const response = await fetch('/api/license/check-global-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey,
        domain: currentDomain
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        valid: false,
        error: errorData.error || `Server error: ${response.status}`
      };
    }

    const data = await response.json();
    return {
      valid: data.valid,
      globallyVerified: data.globallyVerified,
      client: data.client,
      error: data.error
    };
  } catch (error) {
    console.error('Global license check error:', error);
    return {
      valid: false,
      error: `Failed to check global license status: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Check license by domain only (no local storage/cookies)
export async function checkLicenseByDomain(domain?: string): Promise<{
  valid: boolean;
  globallyVerified?: boolean;
  licenseKey?: string;
  error?: string;
  client?: any;
}> {
  const currentDomain = domain || getCurrentDomain();
  
  try {
    const response = await fetch('/api/license/check-by-domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: currentDomain
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        valid: false,
        error: errorData.error || `Server error: ${response.status}`
      };
    }

    const data = await response.json();
    return {
      valid: data.valid,
      globallyVerified: data.globallyVerified,
      licenseKey: data.licenseKey,
      client: data.client,
      error: data.error
    };
  } catch (error) {
    console.error('Domain license check error:', error);
    return {
      valid: false,
      error: `Failed to check license for domain: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Main license validation function - ONLY checks admin database by domain
export async function validateLicense(): Promise<{
  isValid: boolean;
  error?: string;
  needsSetup?: boolean;
}> {
  console.log('Validating license by domain only...');
  
  try {
    // Check license by domain in admin database
    const domainCheck = await checkLicenseByDomain();
    
    if (domainCheck.valid && domainCheck.globallyVerified) {
      console.log('License found and globally verified for this domain');
      return { isValid: true };
    }
    
    if (domainCheck.valid && !domainCheck.globallyVerified) {
      console.log('License found but not globally verified - needs setup');
      return {
        isValid: false,
        needsSetup: true,
        error: 'License exists but needs to be activated'
      };
    }
    
    if (!domainCheck.valid) {
      console.log('No valid license found for this domain');
      return {
        isValid: false,
        needsSetup: true,
        error: domainCheck.error || 'No license found for this domain'
      };
    }
    
    return {
      isValid: false,
      needsSetup: true,
      error: 'License validation failed'
    };
    
  } catch (error) {
    console.error('License validation error:', error);
    return {
      isValid: false,
      needsSetup: true,
      error: 'Unable to verify license - please contact administrator'
    };
  }
}

// Setup new license key
export async function setupLicense(licenseKey: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const verificationResult = await verifyLicense(licenseKey);
    
    if (verificationResult.valid) {
      const status: LicenseStatus = {
        isValid: true,
        licenseKey,
        lastVerified: Date.now(),
        error: null,
        gracePeriodExpiry: null
      };
      
      storeLicenseStatus(status);
      return { success: true };
    } else {
      return {
        success: false,
        error: verificationResult.error || 'Invalid license key'
      };
    }
  } catch (error) {
    console.error('License setup error:', error);
    return {
      success: false,
      error: 'Failed to verify license key'
    };
  }
}