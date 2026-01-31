'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import LicenseGuard from '@/components/LicenseGuard';
import RealtimeLicenseCheck from '@/components/RealtimeLicenseCheck';
import DomainVerificationMonitor from '@/components/DomainVerificationMonitor';

interface AuthenticatedLicenseGuardProps {
  children: React.ReactNode;
}

// Routes that should never have license checking (public routes)
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/register',
    '/verify-otp',
    '/license-setup',
    '/license-invalid',
    // Debug and testing routes
    '/debug/',
    '/test-admin-connection'
  ];
  
  return publicRoutes.some(route => pathname.startsWith(route));
}

export default function AuthenticatedLicenseGuard({ children }: AuthenticatedLicenseGuardProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  
  // Always show children immediately for public routes
  if (isPublicRoute(pathname)) {
    console.log('Public route - skipping all license checks:', pathname);
    return <>{children}</>;
  }
  
  // Always show children immediately for unauthenticated users
  // Let middleware handle the redirect to /register
  if (status === 'loading') {
    console.log('Session loading - showing children without license checks');
    return <>{children}</>;
  }
  
  if (status === 'unauthenticated' || !session) {
    console.log('Unauthenticated user - skipping all license checks, middleware will handle redirect');
    return <>{children}</>;
  }
  
  // Only authenticated users get license checking components
  console.log('Authenticated user - enabling license checks for:', pathname);
  return (
    <DomainVerificationMonitor checkInterval={30000}>
      <LicenseGuard>
        <RealtimeLicenseCheck>
          {children}
        </RealtimeLicenseCheck>
      </LicenseGuard>
    </DomainVerificationMonitor>
  );
}