'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateLicense } from '@/lib/license';

interface LicenseMonitorProps {
  children: React.ReactNode;
}

export default function LicenseMonitor({ children }: LicenseMonitorProps) {
  const router = useRouter();
  const [licenseValid, setLicenseValid] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isActive = true;

    const checkLicense = async () => {
      if (checking || !isActive) return;
      
      setChecking(true);
      
      try {
        const result = await validateLicense();
        
        if (!isActive) return; // Component unmounted
        
        if (!result.isValid) {
          console.warn('License validation failed:', result.error);
          setLicenseValid(false);
          
          // Clear license key from cookie
          document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          
          // Redirect based on the error type
          if (result.needsSetup) {
            router.push('/license-setup');
          } else {
            router.push('/license-invalid');
          }
        } else {
          setLicenseValid(true);
        }
      } catch (error) {
        console.error('License check error:', error);
        if (isActive) {
          setLicenseValid(false);
          router.push('/license-setup');
        }
      } finally {
        if (isActive) {
          setChecking(false);
        }
      }
    };

    // Initial check
    checkLicense();

    // Set up periodic checking every 30 seconds
    intervalId = setInterval(checkLicense, 30000);

    // Cleanup function
    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [router, checking]);

  // Don't render children if license is invalid
  if (!licenseValid) {
    return null;
  }

  return <>{children}</>;
}