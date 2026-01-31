import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    adminPanelUrl: process.env.ADMIN_PANEL_URL || 'Not set',
    tests: [] as any[],
    summary: {} as any
  };

  // Test 1: Basic URL validation
  try {
    const url = new URL(process.env.ADMIN_PANEL_URL || '');
    results.tests.push({
      test: 'URL_VALIDATION',
      status: 'PASS',
      message: `Valid URL: ${url.origin}`
    });
  } catch (error) {
    results.tests.push({
      test: 'URL_VALIDATION',
      status: 'FAIL',
      error: error instanceof Error ? error.message : 'Invalid URL'
    });
  }

  // Test 2: Basic connectivity test
  if (process.env.ADMIN_PANEL_URL) {
    try {
      const startTime = Date.now();
      const response = await fetch(process.env.ADMIN_PANEL_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      const endTime = Date.now();

      results.tests.push({
        test: 'BASIC_CONNECTIVITY',
        status: response.ok ? 'PASS' : 'PARTIAL',
        statusCode: response.status,
        responseTime: `${endTime - startTime}ms`,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      results.tests.push({
        test: 'BASIC_CONNECTIVITY',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Connection failed',
        errorType: error instanceof TypeError ? 'NETWORK_ERROR' : 'UNKNOWN'
      });
    }
  }

  // Test 3: API endpoint test
  if (process.env.ADMIN_PANEL_URL) {
    try {
      const apiUrl = `${process.env.ADMIN_PANEL_URL}/api/saas/verify-license`;
      const startTime = Date.now();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: 'TEST-KEY-FOR-CONNECTIVITY',
          domain: 'test.com'
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      const endTime = Date.now();
      const responseText = await response.text();

      results.tests.push({
        test: 'API_ENDPOINT',
        status: response.status < 500 ? 'PASS' : 'PARTIAL',
        statusCode: response.status,
        responseTime: `${endTime - startTime}ms`,
        responseSize: responseText.length,
        hasJsonResponse: responseText.startsWith('{') || responseText.startsWith('['),
        corsHeaders: {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': response.headers.get('access-control-allow-headers')
        }
      });
    } catch (error) {
      results.tests.push({
        test: 'API_ENDPOINT',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'API request failed',
        errorType: error instanceof TypeError ? 'NETWORK_ERROR' : 'UNKNOWN'
      });
    }
  }

  // Test 4: DNS resolution test
  if (process.env.ADMIN_PANEL_URL) {
    try {
      const url = new URL(process.env.ADMIN_PANEL_URL);
      const dnsTest = await fetch(`https://dns.google/resolve?name=${url.hostname}&type=A`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (dnsTest.ok) {
        const dnsResult = await dnsTest.json();
        results.tests.push({
          test: 'DNS_RESOLUTION',
          status: dnsResult.Answer ? 'PASS' : 'PARTIAL',
          hostname: url.hostname,
          resolved: dnsResult.Answer?.map((a: any) => a.data) || []
        });
      }
    } catch (error) {
      results.tests.push({
        test: 'DNS_RESOLUTION',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'DNS lookup failed'
      });
    }
  }

  // Summary
  const failedTests = results.tests.filter(t => t.status === 'FAIL').length;
  const passedTests = results.tests.filter(t => t.status === 'PASS').length;
  
  results.summary = {
    totalTests: results.tests.length,
    passed: passedTests,
    failed: failedTests,
    overall: failedTests === 0 ? 'HEALTHY' : failedTests === results.tests.length ? 'CRITICAL' : 'DEGRADED'
  };

  return NextResponse.json(results, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}