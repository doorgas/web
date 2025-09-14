'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateLicense } from '@/lib/license';

interface RealtimeLicenseCheckProps {
  children: React.ReactNode;
  skipCheck?: boolean;
}

export default function RealtimeLicenseCheck({ children, skipCheck = false }: RealtimeLicenseCheckProps) {
  const [isValidating, setIsValidating] = useState(!skipCheck);
  const [isValid, setIsValid] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (skipCheck) {
      setIsValid(true);
      setIsValidating(false);
      return;
    }

    const performImmediateLicenseCheck = async () => {
      try {
        console.log('Performing real-time license check on page load...');
        const result = await validateLicense();
        
        if (!result.isValid) {
          console.error('Real-time license check failed:', result.error);
          
          // Clear all license data immediately
          if (typeof window !== 'undefined') {
            document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            localStorage.removeItem('saas_license_status');
            sessionStorage.removeItem('saas_license_status');
            sessionStorage.removeItem('license_cache');
          }
          
          // Check if client was deleted
          const isDeletedClient = result.error?.includes('Invalid license key') || 
                                 result.error?.includes('License key not found');
          
          if (isDeletedClient) {
            console.error('Client deleted - immediate redirect to license setup');
            window.location.href = '/license-setup';
          } else if (result.needsSetup) {
            router.push('/license-setup');
          } else {
            router.push('/license-invalid');
          }
          
          return;
        }
        
        console.log('Real-time license check passed');
        setIsValid(true);
      } catch (error) {
        console.error('Real-time license check error:', error);
        // On error, redirect to license setup
        router.push('/license-setup');
      } finally {
        setIsValidating(false);
      }
    };

    performImmediateLicenseCheck();
  }, [skipCheck, router]);

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying license...</p>
        </div>
      </div>
    );
  }

  // Only render children if license is valid
  return isValid ? <>{children}</> : null;
}
