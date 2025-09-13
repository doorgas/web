'use client';

import { useEffect } from 'react';
import { useLicenseGuard } from '@/hooks/useLicenseGuard';

interface LicenseGuardProps {
  children: React.ReactNode;
}

export default function LicenseGuard({ children }: LicenseGuardProps) {
  // Use the license guard hook with aggressive checking
  useLicenseGuard({
    checkInterval: 30000, // Check every 30 seconds
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