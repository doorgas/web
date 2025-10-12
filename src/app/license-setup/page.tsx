'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { getCurrentDomain } from '@/lib/license';

export default function LicenseSetupPage() {
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDomain, setCurrentDomain] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    setCurrentDomain(getCurrentDomain());
    // Automatically test connection when page loads
    testConnection();
    
    // Check if there's already a globally verified license for this domain
    // Add a small delay to prevent race conditions with middleware
    const timer = setTimeout(() => {
      checkExistingLicense();
    }, 500);
    
    // Check if redirected here due to domain verification failure
    const urlParams = new URLSearchParams(window.location.search);
    const errorType = urlParams.get('error');
    const status = urlParams.get('status');
    const expiry = urlParams.get('expiry');
    
    if (errorType === 'domain_not_found') {
      setError('This domain is not registered in the admin panel. Please contact your administrator to register this domain as a SAAS client.');
    } else if (errorType === 'client_status') {
      setError(`Your SAAS client account status is "${status}" and not active. Please contact your administrator to activate your account.`);
    } else if (errorType === 'subscription_status') {
      setError(`Your subscription status is "${status}" and not active. Please contact your administrator to renew your subscription.`);
    } else if (errorType === 'subscription_expired') {
      const expiryDate = expiry ? new Date(expiry).toLocaleDateString() : 'unknown';
      setError(`Your subscription expired on ${expiryDate}. Please contact your administrator to renew your subscription.`);
    }

    return () => clearTimeout(timer);
  }, []);

  const checkExistingLicense = async () => {
    try {
      const response = await fetch('/api/license/check-by-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: currentDomain || window.location.hostname
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.valid && result.globallyVerified) {
          // License is already globally verified, redirect to home
          // Only redirect if we're confident the license is truly valid
          console.log('License already globally verified, redirecting to home');
          // Use window.location.href for more reliable redirect that bypasses middleware issues
          window.location.href = '/';
          return;
        }
        if (result.valid && !result.globallyVerified && result.licenseKey) {
          // License exists but not verified, pre-fill the form
          setLicenseKey(result.licenseKey);
          console.log('Found existing license key for domain');
        }
      }
    } catch (error) {
      console.log('No existing license found for domain:', error);
      // Silently handle error - don't redirect or set error state
      // This prevents redirect loops when license check fails
    }
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionError('');
    
    try {
      const response = await fetch('/api/debug/test-license-connection');
      const result = await response.json();
      
      if (result.summary?.successful > 0) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setConnectionError('Unable to connect to admin panel. Please check configuration.');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError('Failed to test connection to admin panel.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      setError('Please enter your license key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the same API route that works in debug page
      const response = await fetch('/api/debug/verify-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          domain: currentDomain || window.location.hostname
        })
      });

      const result = await response.json();

      if (result.success && result.result?.valid) {
        // Set up global license verification - this is the only thing that matters
        try {
          const globalSetupResponse = await fetch('/api/license/setup-global', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              licenseKey: licenseKey.trim(),
              domain: currentDomain || window.location.hostname
            })
          });
          
          if (globalSetupResponse.ok) {
            console.log('License globally activated - will work across all browsers now');
            
            // Set persistent session cookie for page refreshes (30 minutes)
            const sessionData = {
              domain: currentDomain || window.location.hostname,
              verified: true,
              expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
              timestamp: Date.now()
            };
            document.cookie = `license_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=${30 * 60}; SameSite=Lax`;
            
            // Redirect to home page
            router.push('/');
            // router.refresh(); // DISABLED: Prevent automatic refresh
            return;
          } else {
            const globalError = await globalSetupResponse.json();
            setError(`Failed to activate license globally: ${globalError.error || 'Unknown error'}`);
            return;
          }
        } catch (globalError) {
          setError(`Failed to set up global license: ${globalError instanceof Error ? globalError.message : 'Unknown error'}`);
          return;
        }
      } else {
        const errorMessage = result.result?.error || result.error || 'Failed to verify license key';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('License setup error:', error);
      setError('An error occurred while setting up the license. Please check your connection to the admin panel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            License Setup Required
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Please enter your license key to activate this website
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Connection Status */}
          <div className="mb-4">
            <Alert className={`${
              connectionStatus === 'success' ? 'border-green-200 bg-green-50' :
              connectionStatus === 'error' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              {connectionStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              {connectionStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {connectionStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
              <AlertDescription className={`${
                connectionStatus === 'success' ? 'text-green-600' :
                connectionStatus === 'error' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {connectionStatus === 'testing' && 'Testing connection to admin panel...'}
                {connectionStatus === 'success' && 'Connected to admin panel successfully'}
                {connectionStatus === 'error' && (connectionError || 'Connection to admin panel failed')}
                {connectionStatus === 'idle' && 'Checking admin panel connection...'}
              </AlertDescription>
            </Alert>
          </div>

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="licenseKey">License Key</Label>
              <Input
                id="licenseKey"
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="LIC-XXXX-XXXX-XXXX-XXXX-XXXX"
                className="font-mono"
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                Enter the license key provided by your administrator
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Domain Information</h4>
                  <p className="text-sm text-blue-700">
                    Current domain: <code className="bg-blue-100 px-1 py-0.5 rounded">{currentDomain}</code>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Make sure your license is configured for this domain
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || connectionStatus === 'error'}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying License...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activate License
                  </>
                )}
              </Button>

              {connectionStatus === 'error' && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={testConnection}
                  disabled={false}
                >
                  Retry Connection Test
                </Button>
              )}
              
              {connectionStatus === 'testing' && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  disabled={true}
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Need Help?</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <span>Contact your administrator for your license key</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <span>Ensure your domain is authorized for the license</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <span>Check that your subscription is active</span>
              </div>
              {connectionStatus === 'error' && (
                <>
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                    <span>Connection failed - check admin panel URL configuration</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <a href="/test-admin-connection" className="underline hover:no-underline">
                      Use advanced connection testing tool
                    </a>
                  </div>
                </>
              )}
              {error.includes('status is') && (
                <>
                  <div className="flex items-center gap-2 text-orange-600">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    <span>Account status issue - contact administrator</span>
                  </div>
                </>
              )}
              {error.includes('subscription') && (
                <>
                  <div className="flex items-center gap-2 text-purple-600">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span>Subscription issue - renewal may be required</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}