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
      
      // Force validation if domain has changed or no stored status
      const shouldForceValidation = !storedStatus || 
        (typeof window !== 'undefined' && storedStatus.lastVerified && 
         Date.now() - storedStatus.lastVerified > checkInterval);

      if (shouldForceValidation) {
        const result = await validateLicense();
        
        if (!result.isValid) {
          console.warn('License validation failed:', result.error);
          
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
          if (onLicenseValid) {
            onLicenseValid();
          }
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error('License check failed:', error);
      
      if (onLicenseInvalid) {
        onLicenseInvalid();
      }
      
      if (redirectOnFailure) {
        router.push('/license-invalid');
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