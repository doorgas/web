'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShieldX, 
  RefreshCw, 
  Settings, 
  Clock, 
  AlertTriangle,
  ExternalLink 
} from 'lucide-react';
import { validateLicense, getStoredLicenseStatus } from '@/lib/license';

export default function LicenseInvalidPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const status = getStoredLicenseStatus();
    setLicenseStatus(status);
  }, []);

  const handleRetryValidation = async () => {
    setLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await validateLicense();
      
      if (result.isValid) {
        router.push('/');
        // router.refresh(); // DISABLED: Prevent automatic refresh
      } else {
        // Update license status display
        const updatedStatus = getStoredLicenseStatus();
        setLicenseStatus(updatedStatus);
      }
    } catch (error) {
      console.error('License validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReconfigureLicense = () => {
    // Clear stored license data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saas_license_status');
      document.cookie = 'license_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    
    router.push('/license-setup');
  };

  const getErrorMessage = () => {
    if (!licenseStatus?.error) {
      return 'Your license could not be verified. Please contact your administrator.';
    }

    const error = licenseStatus.error;
    
    if (error.includes('expired')) {
      return 'Your license has expired. Please renew your subscription to continue using this service.';
    }
    
    if (error.includes('suspended')) {
      return 'Your license has been suspended. Please contact your administrator for assistance.';
    }
    
    if (error.includes('domain')) {
      return 'This domain is not authorized for your license. Please contact your administrator to update your domain settings.';
    }
    
    if (error.includes('not found')) {
      return 'The license key is invalid or not found. Please check your license key and try again.';
    }
    
    return error;
  };

  const getStatusIcon = () => {
    if (licenseStatus?.error?.includes('expired')) {
      return <Clock className="w-8 h-8 text-orange-600" />;
    }
    
    if (licenseStatus?.error?.includes('suspended')) {
      return <AlertTriangle className="w-8 h-8 text-red-600" />;
    }
    
    return <ShieldX className="w-8 h-8 text-red-600" />;
  };

  const isInGracePeriod = licenseStatus?.gracePeriodExpiry && Date.now() < licenseStatus.gracePeriodExpiry;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            License Verification Failed
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Access to this website is currently restricted
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {getErrorMessage()}
            </AlertDescription>
          </Alert>

          {isInGracePeriod && (
            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                <strong>Grace Period Active:</strong> You have temporary access until{' '}
                {new Date(licenseStatus.gracePeriodExpiry).toLocaleString()}.
                Please resolve the license issue as soon as possible.
              </AlertDescription>
            </Alert>
          )}

          {licenseStatus && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <h4 className="font-medium text-gray-900">License Details</h4>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-600">License Key:</span>
                <span className="font-mono text-xs">
                  {licenseStatus.licenseKey ? 
                    `${licenseStatus.licenseKey.substring(0, 8)}...` : 
                    'Not found'
                  }
                </span>
                <span className="text-gray-600">Last Verified:</span>
                <span>
                  {licenseStatus.lastVerified ? 
                    new Date(licenseStatus.lastVerified).toLocaleString() : 
                    'Never'
                  }
                </span>
                <span className="text-gray-600">Status:</span>
                <span className="text-red-600 font-medium">Invalid</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleRetryValidation}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying Validation...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Validation {retryCount > 0 && `(${retryCount})`}
                </>
              )}
            </Button>

            <Button 
              onClick={handleReconfigureLicense}
              variant="outline"
              className="w-full"
            >
              <Settings className="mr-2 h-4 w-4" />
              Reconfigure License
            </Button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">What can you do?</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                <div>
                  <strong>Contact Administrator:</strong> Reach out to your service administrator for license renewal or domain authorization
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                <div>
                  <strong>Check Subscription:</strong> Ensure your subscription is active and not expired
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                <div>
                  <strong>Verify Domain:</strong> Make sure this domain is authorized for your license
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                <div>
                  <strong>Network Issues:</strong> Check your internet connection and try again
                </div>
              </div>
            </div>
          </div>

          {retryCount >= 3 && (
            <Alert className="border-blue-200 bg-blue-50">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                <strong>Still having issues?</strong> After multiple retry attempts, 
                please contact technical support with your license key and error details.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}