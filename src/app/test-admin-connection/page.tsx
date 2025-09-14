'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestAdminConnection() {
  const [adminUrl, setAdminUrl] = useState(process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || '');
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseTestResult, setLicenseTestResult] = useState<any>(null);

  const testConnection = async () => {
    setLoading(true);
    setTestResults(null);

    const results = {
      timestamp: new Date().toISOString(),
      adminUrl,
      tests: [] as any[]
    };

    // Test 1: Basic connectivity kk
    try {
      console.log('Testing basic connectivity to:', adminUrl);
      const response = await fetch(adminUrl, {
        method: 'GET',
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      results.tests.push({
        name: 'Basic Connectivity',
        status: response.ok ? 'PASS' : 'PARTIAL',
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        details: `Response received with status ${response.status}`
      });
    } catch (error) {
      console.error('Basic connectivity error:', error);
      results.tests.push({
        name: 'Basic Connectivity',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to connect to admin panel'
      });
    }

    // Test 2: API endpoint test
    try {
      const apiUrl = `${adminUrl}/api/test/ping`;
      console.log('Testing API endpoint:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();
      let responseData = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      results.tests.push({
        name: 'API Ping Test',
        status: response.ok ? 'PASS' : 'PARTIAL',
        statusCode: response.status,
        statusText: response.statusText,
        responseData,
        details: `API endpoint responded with ${response.status}`
      });
    } catch (error) {
      console.error('API endpoint error:', error);
      results.tests.push({
        name: 'API Ping Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to reach API endpoint'
      });
    }

    // Test 3: License verification endpoint
    try {
      const licenseUrl = `${adminUrl}/api/saas/verify-license`;
      console.log('Testing license endpoint:', licenseUrl);
      
      const response = await fetch(licenseUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: 'TEST-KEY-FOR-CONNECTIVITY',
          domain: window.location.hostname
        })
      });

      const responseText = await response.text();
      let responseData = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      results.tests.push({
        name: 'License Verification Test',
        status: response.status < 500 ? 'PASS' : 'PARTIAL',
        statusCode: response.status,
        statusText: response.statusText,
        responseData,
        details: `License endpoint responded with ${response.status}`
      });
    } catch (error) {
      console.error('License endpoint error:', error);
      results.tests.push({
        name: 'License Verification Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to reach license verification endpoint'
      });
    }

    setTestResults(results);
    setLoading(false);
  };

  const testLicenseVerification = async () => {
    if (!licenseKey.trim()) {
      alert('Please enter a license key to test');
      return;
    }

    setLoading(true);
    setLicenseTestResult(null);

    try {
      console.log('Testing license verification with key:', licenseKey.substring(0, 10) + '...');
      
      const licenseUrl = `${adminUrl}/api/saas/verify-license`;
      const response = await fetch(licenseUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          domain: window.location.hostname
        })
      });

      const responseText = await response.text();
      let responseData = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawResponse: responseText };
      }

      setLicenseTestResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        timestamp: new Date().toISOString(),
        requestData: {
          licenseKey: licenseKey.substring(0, 10) + '...',
          domain: window.location.hostname,
          url: licenseUrl
        }
      });

    } catch (error) {
      console.error('License test error:', error);
      setLicenseTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestData: {
          licenseKey: licenseKey.substring(0, 10) + '...',
          domain: window.location.hostname
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'text-green-600 bg-green-50';
      case 'PARTIAL': return 'text-yellow-600 bg-yellow-50';
      case 'FAIL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel Connection Test</CardTitle>
            <p className="text-sm text-muted-foreground">
              Test the connection between this client site and your admin panel
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminUrl">Admin Panel URL</Label>
              <Input
                id="adminUrl"
                value={adminUrl}
                onChange={(e) => setAdminUrl(e.target.value)}
                placeholder="https://your-admin-domain.com"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter your admin panel domain (without trailing slash)
              </p>
            </div>

            <Button 
              onClick={testConnection} 
              disabled={loading || !adminUrl}
              className="w-full"
            >
              {loading ? 'Testing Connection...' : 'Test Connection'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License Verification Test</CardTitle>
            <p className="text-sm text-muted-foreground">
              Test license verification with a real license key
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="licenseKey">License Key</Label>
              <Input
                id="licenseKey"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="LIC-XXXX-XXXX-XXXX-XXXX-XXXX"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter a valid license key from your admin panel
              </p>
            </div>

            <Button 
              onClick={testLicenseVerification} 
              disabled={loading || !adminUrl || !licenseKey.trim()}
              className="w-full"
              variant="secondary"
            >
              {loading ? 'Testing License...' : 'Test License Verification'}
            </Button>
          </CardContent>
        </Card>

        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tested at: {new Date(testResults.timestamp).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.tests.map((test: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{test.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </div>
                    
                    {test.statusCode && (
                      <p className="text-sm mb-2">
                        <span className="font-medium">Status Code:</span> {test.statusCode} {test.statusText}
                      </p>
                    )}
                    
                    <p className="text-sm text-muted-foreground mb-2">{test.details}</p>
                    
                    {test.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                        <p className="text-sm text-red-700 font-medium">Error:</p>
                        <p className="text-sm text-red-600 font-mono">{test.error}</p>
                      </div>
                    )}
                    
                    {test.responseData && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">Response Data</summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                          {JSON.stringify(test.responseData, null, 2)}
                        </pre>
                      </details>
                    )}

                    {test.headers && Object.keys(test.headers).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">Response Headers</summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                          {JSON.stringify(test.headers, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {licenseTestResult && (
          <Card>
            <CardHeader>
              <CardTitle>License Verification Results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tested at: {new Date(licenseTestResult.timestamp).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    licenseTestResult.success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                  }`}>
                    {licenseTestResult.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>

                {licenseTestResult.status && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">HTTP Status:</span>
                    <span className="font-mono">{licenseTestResult.status} {licenseTestResult.statusText}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="font-medium">Request Data:</span>
                  <pre className="p-2 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(licenseTestResult.requestData, null, 2)}
                  </pre>
                </div>

                {licenseTestResult.data && (
                  <div className="space-y-2">
                    <span className="font-medium">Response Data:</span>
                    <pre className="p-2 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(licenseTestResult.data, null, 2)}
                    </pre>
                  </div>
                )}

                {licenseTestResult.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-sm text-red-700 font-medium">Error:</p>
                    <p className="text-sm text-red-600 font-mono">{licenseTestResult.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Environment Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Current Domain:</span> {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}
              </div>
              <div>
                <span className="font-medium">Current URL:</span> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
              </div>
              <div>
                <span className="font-medium">Environment Admin URL:</span> {process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || 'Not set'}
              </div>
              <div>
                <span className="font-medium">User Agent:</span> {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
