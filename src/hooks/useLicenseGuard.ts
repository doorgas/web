'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { validateLicense, getCurrentDomain, getStoredLicenseStatus } from '@/lib/license';

interface UseLicenseGuardOptions {
  checkInterval?: number; // in milliseconds, default 30 seconds
  redirectOnFailure?: boolean; // default true
  skipCheck?: boolean; // skip license checking entirely, default false
  onLicenseInvalid?: () => void;
  onLicenseValid?: () => void;
}

export function useLicenseGuard(options: UseLicenseGuardOptions = {}) {
  const {
    checkInterval = 5000, // 5 seconds - much faster for deleted client detection
    redirectOnFailure = true,
    skipCheck = false,
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
      
      // Check if we're on the license setup page to prevent redirect loops
      const isOnLicenseSetup = typeof window !== 'undefined' && 
                              window.location.pathname === '/license-setup';
      
      // ALWAYS validate - be very strict
      const result = await validateLicense();
      
      if (!result.isValid) {
        console.warn('License validation failed:', result.error);
        
        // Immediately clear ALL license data from cookie and localStorage
        if (typeof window !== 'undefined') {
          document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          localStorage.removeItem('saas_license_status');
          
          // Force clear any cached license status
          sessionStorage.removeItem('saas_license_status');
          sessionStorage.removeItem('license_cache');
        }
        
        // Special handling for deleted clients - immediate redirect
        const isDeletedClient = result.error?.includes('Invalid license key') || 
                               result.error?.includes('License key not found');
        
        if (onLicenseInvalid) {
          onLicenseInvalid();
        }
        
        if (redirectOnFailure && !isOnLicenseSetup) {
          if (result.needsSetup || isDeletedClient) {
            // Force immediate redirect for deleted clients
            if (isDeletedClient) {
              console.error('Client deleted from admin panel - immediate access revocation');
              window.location.href = '/license-invalid';
            } else {
              router.push('/license-setup');
            }
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
      
      // Check if we're on the license setup page to prevent redirect loops
      const isOnLicenseSetup = typeof window !== 'undefined' && 
                              window.location.pathname === '/license-setup';
      
      // Clear license on any error - be very strict
      if (typeof window !== 'undefined') {
        document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        localStorage.removeItem('saas_license_status');
      }
      
      if (onLicenseInvalid) {
        onLicenseInvalid();
      }
      
      if (redirectOnFailure && !isOnLicenseSetup) {
        router.push('/license-setup');
      }
      
      return false;
    }
  }, [checkInterval, redirectOnFailure, onLicenseInvalid, onLicenseValid, router]);

  useEffect(() => {
    // Skip all license checking if skipCheck is true
    if (skipCheck) {
      console.log('License checking skipped for this route');
      return;
    }

    // Initial check
    performLicenseCheck();

    // Set up interval checking
    const intervalId = setInterval(performLicenseCheck, checkInterval);

    // DISABLED: Check on window focus (catches domain changes when user returns to tab)
    // const handleFocus = () => {
    //   performLicenseCheck();
    // };

    // DISABLED: Check when domain might have changed (via popstate - back/forward)
    // const handlePopState = () => {
    //   performLicenseCheck();
    // };

    // window.addEventListener('focus', handleFocus);
    // window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(intervalId);
      // window.removeEventListener('focus', handleFocus);
      // window.removeEventListener('popstate', handlePopState);
    };
  }, [performLicenseCheck, checkInterval, skipCheck]);

  return {
    checkLicense: performLicenseCheck
  };
}