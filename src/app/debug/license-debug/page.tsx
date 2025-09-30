'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function LicenseDebugPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);

  const handleDebug = async () => {
    setLoading(true);
    setDebugResult(null);

    try {
      const response = await fetch('/api/debug/license-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          domain: domain.trim() || window.location.hostname
        })
      });

      const result = await response.json();
      setDebugResult(result);
    } catch (error) {
      setDebugResult({
        error: 'Failed to debug license',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step: string) => {
    if (step.startsWith('✅')) return '✅';
    if (step.startsWith('❌')) return '❌';
    if (step.startsWith('🔍')) return '🔍';
    return '📝';
  };

  const getStepColor = (step: string) => {
    if (step.startsWith('✅')) return 'text-green-600';
    if (step.startsWith('❌')) return 'text-red-600';
    if (step.startsWith('🔍')) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>License Debug Tool</CardTitle>
            <p className="text-gray-600">Debug license verification issues</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="licenseKey">License Key</Label>
                <Input
                  id="licenseKey"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Enter license key to debug"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="domain">Domain (optional)</Label>
                <Input
                  id="domain"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={`Leave empty to use current domain: ${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`}
                />
              </div>
              <Button 
                onClick={handleDebug} 
                disabled={loading || !licenseKey.trim()}
                className="w-full"
              >
                {loading ? 'Debugging...' : 'Debug License'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {debugResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Debug Results
                <Badge variant={debugResult.result === 'SUCCESS' ? 'default' : 'destructive'}>
                  {debugResult.result || 'FAILED'}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-500">{debugResult.timestamp}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Environment Check */}
                <div>
                  <h3 className="font-semibold mb-2">Environment Variables</h3>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    {debugResult.environment && Object.entries(debugResult.environment).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className={value === 'NOT_SET' ? 'text-red-600' : 'text-green-600'}>
                          {value as string}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                {debugResult.steps && (
                  <div>
                    <h3 className="font-semibold mb-2">Debug Steps</h3>
                    <div className="space-y-2">
                      {debugResult.steps.map((step: string, index: number) => (
                        <div key={index} className={`flex items-start gap-2 ${getStepColor(step)}`}>
                          <span className="text-lg">{getStepIcon(step)}</span>
                          <span className="text-sm">{step.replace(/^[✅❌🔍]\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client Data */}
                {debugResult.clientData && (
                  <div>
                    <h3 className="font-semibold mb-2">Client Information</h3>
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <div><strong>ID:</strong> {debugResult.clientData.id}</div>
                      <div><strong>Company:</strong> {debugResult.clientData.companyName}</div>
                      <div><strong>Status:</strong> {debugResult.clientData.status}</div>
                      <div><strong>Subscription:</strong> {debugResult.clientData.subscriptionStatus}</div>
                      <div><strong>Domain:</strong> {debugResult.clientData.websiteDomain}</div>
                      <div><strong>License Verified:</strong> 
                        <Badge className="ml-2" variant={debugResult.clientData.licenseVerified === 'yes' ? 'default' : 'secondary'}>
                          {debugResult.clientData.licenseVerified}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Domain Check */}
                {debugResult.domainCheck && (
                  <div>
                    <h3 className="font-semibold mb-2">Domain Validation</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div><strong>Request Domain:</strong> {debugResult.domainCheck.requestDomain}</div>
                      <div><strong>Client Domain:</strong> {debugResult.domainCheck.clientDomain}</div>
                      <div><strong>Match:</strong> 
                        <Badge className="ml-2" variant={debugResult.domainCheck.match ? 'default' : 'destructive'}>
                          {debugResult.domainCheck.match ? 'YES' : 'NO'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available Licenses (if license not found) */}
                {debugResult.availableLicenses && (
                  <div>
                    <h3 className="font-semibold mb-2">Available Licenses (Sample)</h3>
                    <div className="bg-yellow-50 p-3 rounded text-sm">
                      {debugResult.availableLicenses.map((license: any) => (
                        <div key={license.id}>
                          <strong>ID:</strong> {license.id} - <strong>Key:</strong> {license.licenseKey}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {(debugResult.error || debugResult.dbError || debugResult.queryError) && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription>
                      <div className="space-y-2">
                        {debugResult.error && <div><strong>Error:</strong> {debugResult.error}</div>}
                        {debugResult.dbError && (
                          <div>
                            <strong>Database Error:</strong> {debugResult.dbError.message}
                            {debugResult.dbError.code && <div><strong>Code:</strong> {debugResult.dbError.code}</div>}
                          </div>
                        )}
                        {debugResult.queryError && (
                          <div><strong>Query Error:</strong> {debugResult.queryError.message}</div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}