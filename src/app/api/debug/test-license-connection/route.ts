import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
  const results = {
    adminPanelUrl,
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Test 1: Simple test endpoint
  try {
    const testUrl = `${adminPanelUrl}/api/saas/test`;
    console.log('Testing SAAS test endpoint:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    
    const responseText = await response.text();
    
    results.tests.push({
      name: 'SAAS_TEST_ENDPOINT',
      url: testUrl,
      method: 'GET',
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      response: responseText.substring(0, 300),
      headers: {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'content-type': response.headers.get('content-type')
      }
    });
  } catch (error) {
    results.tests.push({
      name: 'SAAS_TEST_ENDPOINT',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: License verification endpoint
  try {
    const testUrl = `${adminPanelUrl}/api/saas/verify-license`;
    console.log('Testing license verification endpoint:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: 'TEST-CONNECTIVITY-KEY',
        domain: 'test.com'
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const responseText = await response.text();
    
    results.tests.push({
      name: 'LICENSE_VERIFICATION_ENDPOINT',
      url: testUrl,
      method: 'POST',
      status: response.status,
      statusText: response.statusText,
      success: response.status < 500, // Accept any response < 500 as success
      response: responseText.substring(0, 500),
      headers: {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'content-type': response.headers.get('content-type')
      }
    });
  } catch (error) {
    results.tests.push({
      name: 'LICENSE_VERIFICATION_ENDPOINT',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: OPTIONS request (CORS preflight)
  try {
    const testUrl = `${adminPanelUrl}/api/saas/verify-license`;
    
    const response = await fetch(testUrl, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(5000)
    });
    
    results.tests.push({
      name: 'CORS_PREFLIGHT_OPTIONS',
      url: testUrl,
      method: 'OPTIONS',
      status: response.status,
      success: response.ok,
      corsHeaders: {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      }
    });
  } catch (error) {
    results.tests.push({
      name: 'CORS_PREFLIGHT_OPTIONS',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  const successfulTests = results.tests.filter(t => t.success).length;
  const totalTests = results.tests.length;

  return NextResponse.json({
    ...results,
    summary: {
      totalTests,
      successful: successfulTests,
      failed: totalTests - successfulTests,
      overallSuccess: successfulTests > 0
    }
  });
}