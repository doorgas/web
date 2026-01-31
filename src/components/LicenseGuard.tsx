'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLicenseGuard } from '@/hooks/useLicenseGuard';

interface LicenseGuardProps {
  children: React.ReactNode;
}

// Routes that should be exempt from license checking
function isLicenseExemptRoute(pathname: string): boolean {
  const exemptRoutes = [
    '/license-setup',
    '/license-invalid',
    '/register',
    '/verify-otp',
    // Debug and testing routes - allow access without license verification
    '/debug/',
    '/test-admin-connection'
  ];
  
  return exemptRoutes.some(route => pathname.startsWith(route));
}

export default function LicenseGuard({ children }: LicenseGuardProps) {
  const pathname = usePathname();
  
  // Skip license checking for exempt routes
  const shouldSkipLicenseCheck = isLicenseExemptRoute(pathname);
  
  // Only use the license guard hook if not on an exempt route
  useLicenseGuard({
    checkInterval: pathname === '/license-setup' ? 30000 : 10000, // Check every 30 seconds on license-setup, 10 seconds elsewhere
    redirectOnFailure: true,
    skipCheck: shouldSkipLicenseCheck, // Add this option
    onLicenseInvalid: () => {
      console.warn('License validation failed - redirecting to license page');
    },
    onLicenseValid: () => {
      console.debug('License validation successful');
    }
  });

  return <>{children}</>;
}