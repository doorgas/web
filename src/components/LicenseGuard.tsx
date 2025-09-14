'use client';

import { useEffect } from 'react';
import { useLicenseGuard } from '@/hooks/useLicenseGuard';

interface LicenseGuardProps {
  children: React.ReactNode;
}

export default function LicenseGuard({ children }: LicenseGuardProps) {
  // Use the license guard hook with aggressive checking
  useLicenseGuard({
    checkInterval: 10000, // Check every 10 seconds - very aggressive
    redirectOnFailure: true,
    onLicenseInvalid: () => {
      console.warn('License validation failed - redirecting to license page');
    },
    onLicenseValid: () => {
      console.debug('License validation successful');
    }
  });

  return <>{children}</>;
}