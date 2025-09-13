'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { setupLicense, getCurrentDomain } from '@/lib/license';

export default function LicenseSetupPage() {
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
    setCurrentDomain(getCurrentDomain());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      setError('Please enter your license key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await setupLicense(licenseKey.trim());

      if (result.success) {
        // Store license key in cookie for middleware
        document.cookie = `license_key=${licenseKey.trim()}; path=/; max-age=31536000`; // 1 year
        
        // Redirect to home page
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || 'Failed to verify license key');
      }
    } catch (error) {
      console.error('License setup error:', error);
      setError('An error occurred while setting up the license');
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}