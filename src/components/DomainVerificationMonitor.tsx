'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface DomainVerificationMonitorProps {
  children: React.ReactNode;
  checkInterval?: number; // in milliseconds, default 30 seconds
  skipCheck?: boolean; // skip domain verification entirely
}

interface DomainCheckResult {
  success: boolean;
  result?: {
    exists: boolean;
    domain?: string;
    client?: any;
  };
  error?: string;
}

export default function DomainVerificationMonitor({ 
  children, 
  checkInterval = 30000, // 30 seconds
  skipCheck = false 
}: DomainVerificationMonitorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [domainStatus, setDomainStatus] = useState<'checking' | 'valid' | 'invalid' | 'error'>('checking');
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pages where domain verification should be skipped
  const shouldSkipDomainCheck = (): boolean => {
    if (skipCheck) return true;
    
    // Check both pathname and window.location for robustness
    const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
    
    const exemptRoutes = [
      '/test-admin-connection',
      '/debug/',
      '/license-setup',
      '/license-invalid',
      '/logout'
    ];
    
    return exemptRoutes.some(route => currentPath.startsWith(route));
  };

  const performDomainCheck = async (): Promise<void> => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) return;
    
    try {
      isCheckingRef.current = true;
      const currentDomain = window.location.hostname;
      
      console.log('Domain verification check:', { 
        domain: currentDomain, 
        timestamp: new Date().toISOString() 
      });

      const response = await fetch('/api/debug/check-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: currentDomain
        })
      });

      const result: DomainCheckResult = await response.json();
      setLastCheckTime(Date.now());

      if (result.success && result.result?.exists && result.result.client) {
        const client = result.result.client;
        
        // Check client status
        if (client.status !== 'active') {
          console.error('Domain verification: FAILED - Client status is not active:', client.status);
          setDomainStatus('invalid');
          
          // Clear cached license data
          localStorage.removeItem('saas_license_status');
          sessionStorage.removeItem('saas_license_status');
          document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          
          // Redirect with status error
          router.push(`/license-setup?error=client_status&status=${client.status}`);
          return;
        }
        
        // Check subscription status
        if (client.subscriptionStatus !== 'active') {
          console.error('Domain verification: FAILED - Subscription status is not active:', client.subscriptionStatus);
          setDomainStatus('invalid');
          
          // Clear cached license data
          localStorage.removeItem('saas_license_status');
          sessionStorage.removeItem('saas_license_status');
          document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          
          // Redirect with subscription status error
          router.push(`/license-setup?error=subscription_status&status=${client.subscriptionStatus}`);
          return;
        }
        
        // Check subscription expiry date
        if (client.subscriptionEndDate) {
          const expiryDate = new Date(client.subscriptionEndDate);
          const now = new Date();
          
          if (now > expiryDate) {
            console.error('Domain verification: FAILED - Subscription expired:', client.subscriptionEndDate);
            setDomainStatus('invalid');
            
            // Clear cached license data
            localStorage.removeItem('saas_license_status');
            sessionStorage.removeItem('saas_license_status');
            document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            
            // Redirect with subscription expired error
            router.push(`/license-setup?error=subscription_expired&expiry=${client.subscriptionEndDate}`);
            return;
          }
        }
        
        // All checks passed
        console.log('Domain verification: PASSED - All checks successful', {
          domain: result.result.domain,
          status: client.status,
          subscriptionStatus: client.subscriptionStatus,
          subscriptionEndDate: client.subscriptionEndDate
        });
        setDomainStatus('valid');
      } else {
        console.error('Domain verification: FAILED - Domain not found in admin database', result);
        setDomainStatus('invalid');
        
        // Clear any cached license data since domain is not registered
        localStorage.removeItem('saas_license_status');
        sessionStorage.removeItem('saas_license_status');
        document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        
        // Redirect to license setup with domain error
        router.push('/license-setup?error=domain_not_found');
      }
    } catch (error) {
      console.error('Domain verification check failed:', error);
      setDomainStatus('error');
      
      // On network error, don't immediately redirect - could be temporary
      // But log the issue for monitoring
      console.warn('Domain verification network error - continuing with current session');
    } finally {
      isCheckingRef.current = false;
    }
  };

  // Initialize domain check on component mount
  useEffect(() => {
    const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
    const skipCheck = shouldSkipDomainCheck();
    
    console.log('DomainVerificationMonitor: Initializing', { 
      currentPath, 
      skipCheck, 
      isServer: typeof window === 'undefined' 
    });
    
    if (skipCheck || typeof window === 'undefined') {
      console.log('DomainVerificationMonitor: Skipping domain check for', currentPath);
      setIsInitialized(true);
      setDomainStatus('valid');
      return;
    }

    // Perform initial domain check
    const initializeDomainCheck = async () => {
      try {
        await performDomainCheck();
      } catch (error) {
        console.error('DomainVerificationMonitor: Initial check failed', error);
        // On error, still initialize to prevent infinite loading
        setDomainStatus('error');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeDomainCheck();
    
    // Fallback timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (!isInitialized) {
        console.warn('DomainVerificationMonitor: Timeout reached, forcing initialization');
        setIsInitialized(true);
        setDomainStatus('error');
      }
    }, 10000); // 10 second timeout
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]); // Re-run when pathname changes

  // Set up interval for periodic domain checks
  useEffect(() => {
    if (shouldSkipDomainCheck() || !isInitialized || typeof window === 'undefined') return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(performDomainCheck, checkInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkInterval, pathname, isInitialized]);

  // DISABLED: Handle page visibility changes - check domain when page becomes visible
  // useEffect(() => {
  //   if (shouldSkipDomainCheck() || typeof window === 'undefined') return;

  //   const handleVisibilityChange = () => {
  //     if (!document.hidden && isInitialized) {
  //       // Check if it's been more than the check interval since last check
  //       const timeSinceLastCheck = Date.now() - lastCheckTime;
  //       if (timeSinceLastCheck > checkInterval) {
  //         performDomainCheck();
  //       }
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
    
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [checkInterval, pathname, isInitialized, lastCheckTime]);

  // Show loading state during initial domain verification
  if (!isInitialized && !shouldSkipDomainCheck()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying domain registration...</p>
          <p className="text-sm text-gray-500 mt-2">
            Checking if {typeof window !== 'undefined' ? window.location.hostname : 'domain'} is registered
          </p>
        </div>
      </div>
    );
  }

  // Only render children if domain verification passed or is skipped
  if (shouldSkipDomainCheck() || domainStatus === 'valid' || domainStatus === 'error') {
    return <>{children}</>;
  }

  // If domain is invalid, show error state (this shouldn't normally be visible due to redirect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600 mb-4">
          Your domain access has been restricted. This could be due to domain registration, account status, or subscription issues.
        </p>
        <p className="text-sm text-red-500">
          Redirecting to license setup for more information...
        </p>
      </div>
    </div>
  );
}
