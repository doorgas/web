'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Network, Server } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  message?: string;
  error?: string;
  details?: any;
}

export default function ConnectionTestPage() {
  const [serverResults, setServerResults] = useState<any>(null);
  const [clientResults, setClientResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runServerDiagnostics = async () => {
    try {
      const response = await fetch('/api/debug/diagnose-connection');
      const results = await response.json();
      setServerResults(results);
    } catch (error) {
      setServerResults({
        error: error instanceof Error ? error.message : 'Server diagnostic failed'
      });
    }
  };

  const runClientTests = async () => {
    const results: TestResult[] = [];
    
    // Test 1: Environment check
    try {
      results.push({
        test: 'ENVIRONMENT_CHECK',
        status: 'PASS',
        details: {
          userAgent: navigator.userAgent,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          port: window.location.port || 'default'
        }
      });
    } catch (error) {
      results.push({
        test: 'ENVIRONMENT_CHECK',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Environment check failed'
      });
    }

    // Test 2: Direct admin panel connection
    try {
      const adminUrl = 'https://flower-delivery-final-admin.vercel.app';
      const startTime = Date.now();
      
      const response = await fetch(adminUrl, {
        method: 'GET',
        mode: 'no-cors' // This will succeed if the server is reachable
      });
      
      const endTime = Date.now();
      
      results.push({
        test: 'DIRECT_CONNECTION',
        status: 'PASS',
        message: `Connected to admin panel in ${endTime - startTime}ms`,
        details: {
          url: adminUrl,
          responseTime: endTime - startTime
        }
      });
    } catch (error) {
      results.push({
        test: 'DIRECT_CONNECTION',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Direct connection failed'
      });
    }

    // Test 3: CORS API test
    try {
      const apiUrl = 'https://flower-delivery-final-admin.vercel.app/api/saas/verify-license';
      const startTime = Date.now();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: 'TEST-CLIENT-CONNECTIVITY',
          domain: window.location.hostname
        })
      });
      
      const endTime = Date.now();
      const responseText = await response.text();
      
      results.push({
        test: 'CORS_API_TEST',
        status: response.status < 500 ? 'PASS' : 'PARTIAL',
        message: `API responded with ${response.status} in ${endTime - startTime}ms`,
        details: {
          statusCode: response.status,
          responseTime: endTime - startTime,
          corsHeaders: {
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
            'access-control-allow-methods': response.headers.get('access-control-allow-methods')
          },
          hasResponse: responseText.length > 0
        }
      });
    } catch (error) {
      results.push({
        test: 'CORS_API_TEST',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'CORS API test failed'
      });
    }

    // Test 4: Alternative endpoints
    const alternativeUrls = [
      'https://flower-delivery-final-admin.vercel.app/api/health',
      'https://flower-delivery-final-admin.vercel.app/api/status'
    ];

    for (const url of alternativeUrls) {
      try {
        const response = await fetch(url, { method: 'GET', mode: 'cors' });
        results.push({
          test: `ALTERNATIVE_ENDPOINT_${url.split('/').pop()?.toUpperCase()}`,
          status: response.ok ? 'PASS' : 'PARTIAL',
          details: {
            url,
            statusCode: response.status
          }
        });
      } catch (error) {
        results.push({
          test: `ALTERNATIVE_ENDPOINT_${url.split('/').pop()?.toUpperCase()}`,
          status: 'FAIL',
          error: error instanceof Error ? error.message : 'Alternative endpoint failed'
        });
      }
    }

    setClientResults(results);
  };

  const runAllTests = async () => {
    setLoading(true);
    setServerResults(null);
    setClientResults([]);

    try {
      await Promise.all([
        runServerDiagnostics(),
        runClientTests()
      ]);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'FAIL': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'PARTIAL': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'PASS': 'default',
      'FAIL': 'destructive',
      'PARTIAL': 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">License Server Connection Diagnostics</h1>
        <p className="text-gray-600">
          Comprehensive testing of network connectivity to the admin panel
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={runAllTests} 
          disabled={loading}
          size="lg"
          className="w-full md:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Network className="mr-2 h-4 w-4" />
              Run Full Diagnostic
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server-side Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Server-side Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serverResults ? (
              <div className="space-y-4">
                {serverResults.error ? (
                  <Alert className="border-red-500">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Server diagnostic failed: {serverResults.error}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Admin URL:</span>
                        <br />
                        <span className="text-xs break-all">{serverResults.adminPanelUrl}</span>
                      </div>
                      <div>
                        <span className="font-medium">Overall:</span>
                        <br />
                        {getStatusBadge(serverResults.summary?.overall || 'UNKNOWN')}
                      </div>
                      <div>
                        <span className="font-medium">Tests:</span>
                        <br />
                        <span className="text-xs">{serverResults.summary?.passed}/{serverResults.summary?.totalTests} passed</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {serverResults.tests?.map((test: any, index: number) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{test.test}</span>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(test.status)}
                              {getStatusBadge(test.status)}
                            </div>
                          </div>
                          {test.message && (
                            <p className="text-xs text-gray-600">{test.message}</p>
                          )}
                          {test.error && (
                            <p className="text-xs text-red-600">{test.error}</p>
                          )}
                          {test.statusCode && (
                            <p className="text-xs text-gray-500">Status: {test.statusCode}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Running server tests...</span>
              </div>
            ) : (
              <p className="text-gray-500">Click "Run Full Diagnostic" to start testing</p>
            )}
          </CardContent>
        </Card>

        {/* Client-side Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Client-side Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientResults.length > 0 ? (
              <div className="space-y-2">
                {clientResults.map((test, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{test.test}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(test.status)}
                        {getStatusBadge(test.status)}
                      </div>
                    </div>
                    {test.message && (
                      <p className="text-xs text-gray-600">{test.message}</p>
                    )}
                    {test.error && (
                      <p className="text-xs text-red-600">{test.error}</p>
                    )}
                    {test.details && (
                      <details className="text-xs text-gray-500 mt-2">
                        <summary className="cursor-pointer">Details</summary>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Running client tests...</span>
              </div>
            ) : (
              <p className="text-gray-500">Click "Run Full Diagnostic" to start testing</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Fixes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Common Solutions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Network Issues:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Check if admin panel URL is correct</li>
                <li>• Verify admin panel is deployed and accessible</li>
                <li>• Test admin panel directly in browser</li>
                <li>• Check for firewall/proxy blocking requests</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">CORS Issues:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Verify CORS headers are configured in admin panel</li>
                <li>• Check if admin panel allows your domain</li>
                <li>• Test with different request methods</li>
                <li>• Verify API endpoints are publicly accessible</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}