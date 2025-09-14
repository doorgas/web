'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { validateLicense, getCurrentDomain, getStoredLicenseStatus } from '@/lib/license';

interface UseLicenseGuardOptions {
  checkInterval?: number; // in milliseconds, default 30 seconds
  redirectOnFailure?: boolean; // default true
  onLicenseInvalid?: () => void;
  onLicenseValid?: () => void;
}

export function useLicenseGuard(options: UseLicenseGuardOptions = {}) {
  const {
    checkInterval = 30000, // 30 seconds
    redirectOnFailure = true,
    onLicenseInvalid,
    onLicenseValid
  } = options;
  
  const router = useRouter();

  const performLicenseCheck = useCallback(async () => {
    try {
      const currentDomain = getCurrentDomain();
      const storedStatus = getStoredLicenseStatus();
      
      console.log('License check - current domain:', currentDomain);
      console.log('Stored status:', storedStatus ? { 
        isValid: storedStatus.isValid, 
        lastVerified: new Date(storedStatus.lastVerified || 0).toISOString(),
        licenseKey: storedStatus.licenseKey?.substring(0, 10) + '...'
      } : null);
      
      // ALWAYS validate - be very strict
      const result = await validateLicense();
      
      if (!result.isValid) {
        console.warn('License validation failed:', result.error);
        
        // Clear invalid license from cookie and localStorage
        if (typeof window !== 'undefined') {
          document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          localStorage.removeItem('saas_license_status');
        }
        
        if (onLicenseInvalid) {
          onLicenseInvalid();
        }
        
        if (redirectOnFailure) {
          if (result.needsSetup) {
            router.push('/license-setup');
          } else {
            router.push('/license-invalid');
          }
        }
        
        return false;
      } else {
        console.log('License validation successful');
        if (onLicenseValid) {
          onLicenseValid();
        }
        return true;
      }
    } catch (error) {
      console.error('License check failed:', error);
      
      // Clear license on any error - be very strict
      if (typeof window !== 'undefined') {
        document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        localStorage.removeItem('saas_license_status');
      }
      
      if (onLicenseInvalid) {
        onLicenseInvalid();
      }
      
      if (redirectOnFailure) {
        router.push('/license-setup');
      }
      
      return false;
    }
  }, [checkInterval, redirectOnFailure, onLicenseInvalid, onLicenseValid, router]);

  useEffect(() => {
    // Initial check
    performLicenseCheck();

    // Set up interval checking
    const intervalId = setInterval(performLicenseCheck, checkInterval);

    // Check on window focus (catches domain changes when user returns to tab)
    const handleFocus = () => {
      performLicenseCheck();
    };

    // Check when domain might have changed (via popstate - back/forward)
    const handlePopState = () => {
      performLicenseCheck();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [performLicenseCheck, checkInterval]);

  return {
    checkLicense: performLicenseCheck
  };
}