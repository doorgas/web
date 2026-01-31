'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Settings,
  Eye,
  EyeOff 
} from 'lucide-react';
import { 
  validateLicense, 
  getStoredLicenseStatus, 
  getCurrentDomain,
  updateLicenseStatus 
} from '@/lib/license';

interface LicenseStatusProps {
  className?: string;
}

export default function LicenseStatus({ className = '' }: LicenseStatusProps) {
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
    setCurrentDomain(getCurrentDomain());
    loadLicenseStatus();

    // Set up automatic license checking every 30 seconds
    const intervalId = setInterval(async () => {
      try {
        const result = await validateLicense();
        if (!result.isValid) {
          console.warn('License validation failed:', result.error);
          // Redirect to license invalid page if license becomes invalid
          if (result.error && !result.needsSetup) {
            window.location.href = '/license-invalid';
          } else if (result.needsSetup) {
            window.location.href = '/license-setup';
          }
        }
        loadLicenseStatus();
      } catch (error) {
        console.error('Automatic license check failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const loadLicenseStatus = () => {
    const status = getStoredLicenseStatus();
    setLicenseStatus(status);
  };

  const handleRefreshStatus = async () => {
    setLoading(true);

    try {
      const status = getStoredLicenseStatus();
      if (status?.licenseKey) {
        const updatedStatus = await updateLicenseStatus(status.licenseKey);
        setLicenseStatus(updatedStatus);
      } else {
        const result = await validateLicense();
        loadLicenseStatus();
      }
    } catch (error) {
      console.error('Error refreshing license status:', error);
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
    
    window.location.href = '/license-setup';
  };

  const getStatusBadge = () => {
    if (!licenseStatus) {
      return <Badge variant="secondary">Unknown</Badge>;
    }

    if (licenseStatus.isValid) {
      return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
    }

    if (licenseStatus.gracePeriodExpiry && Date.now() < licenseStatus.gracePeriodExpiry) {
      return <Badge className="bg-orange-100 text-orange-800">Grace Period</Badge>;
    }

    return <Badge variant="destructive">Invalid</Badge>;
  };

  const getStatusIcon = () => {
    if (!licenseStatus) {
      return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }

    if (licenseStatus.isValid) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }

    if (licenseStatus.gracePeriodExpiry && Date.now() < licenseStatus.gracePeriodExpiry) {
      return <Clock className="w-5 h-5 text-orange-600" />;
    }

    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const formatLicenseKey = (key: string) => {
    if (!showLicenseKey) {
      return key.substring(0, 8) + '*'.repeat(Math.max(0, key.length - 8));
    }
    return key;
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const isInGracePeriod = licenseStatus?.gracePeriodExpiry && Date.now() < licenseStatus.gracePeriodExpiry;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          License Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">License Status</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Current Domain */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Current Domain:</span>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
            {currentDomain}
          </code>
        </div>

        {/* License Key */}
        {licenseStatus?.licenseKey && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">License Key:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLicenseKey(!showLicenseKey)}
                className="h-auto p-1"
              >
                {showLicenseKey ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </Button>
            </div>
            <code className="block bg-gray-100 px-3 py-2 rounded text-xs font-mono">
              {formatLicenseKey(licenseStatus.licenseKey)}
            </code>
          </div>
        )}

        {/* Last Verified */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Last Verified:</span>
          <span className="text-xs">
            {formatDate(licenseStatus?.lastVerified)}
          </span>
        </div>

        {/* Error Message */}
        {licenseStatus?.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 text-sm">
              {licenseStatus.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Grace Period Warning */}
        {isInGracePeriod && (
          <Alert className="border-orange-200 bg-orange-50">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 text-sm">
              Grace period active until{' '}
              {new Date(licenseStatus.gracePeriodExpiry).toLocaleString()}.
              Please resolve license issues soon.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleRefreshStatus}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
          
          <Button
            size="sm"
            onClick={handleReconfigureLicense}
            variant="outline"
          >
            <Settings className="w-4 h-4 mr-1" />
            Reconfigure
          </Button>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
          <p>
            License verification ensures your website access is properly authorized.
            Contact your administrator if you experience any issues.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}