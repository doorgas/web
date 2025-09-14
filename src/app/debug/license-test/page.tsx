'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LicenseTestPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/debug/test-license-connection');
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testLicenseVerification = async () => {
    if (!licenseKey) {
      alert('Please enter a license key');
      return;
    }

    setLoading(true);
    setVerifyResult(null);
    
    try {
      const response = await fetch('/api/debug/verify-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey,
          domain: window.location.hostname
        })
      });
      
      const result = await response.json();
      setVerifyResult(result);
    } catch (error) {
      setVerifyResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">License System Debug</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testConnection} disabled={loading}>
              {loading ? 'Testing...' : 'Test Admin Panel Connection'}
            </Button>
            
            {testResult && (
              <Alert className={`mt-4 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
                <AlertDescription>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License Verification Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="licenseKey">License Key</Label>
                <Input
                  id="licenseKey"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Enter license key to test"
                />
              </div>
              
              <Button onClick={testLicenseVerification} disabled={loading}>
                {loading ? 'Verifying...' : 'Test License Verification'}
              </Button>
              
              {verifyResult && (
                <Alert className={`mt-4 ${verifyResult.success ? 'border-green-500' : 'border-red-500'}`}>
                  <AlertDescription>
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(verifyResult, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Current Domain:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</div>
              <div><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
              <div><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}