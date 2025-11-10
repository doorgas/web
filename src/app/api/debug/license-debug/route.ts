import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, domain } = body;
    
    console.log('DEBUG: License debug request:', { 
      licenseKey: licenseKey?.substring(0, 10) + '...', 
      domain,
      timestamp: new Date().toISOString()
    });

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      input: {
        licenseKey: licenseKey?.substring(0, 10) + '...',
        domain: domain
      },
      environment: {
        ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || 'NOT_SET',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET'
      },
      steps: []
    };

    if (!licenseKey || !domain) {
      debugInfo.error = 'Missing license key or domain';
      debugInfo.steps.push('❌ Validation failed: Missing required parameters');
      return NextResponse.json(debugInfo, { status: 400 });
    }

    debugInfo.steps.push('✅ Input validation passed');

    // Test admin panel connection
    try {
      debugInfo.steps.push('🔍 Testing admin panel connection...');
      
      const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'https://flower-delivery-final-admin.vercel.app';
      const testUrl = `${adminPanelUrl}/api/saas/verify-license`;
      
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: 'test-key',
          domain: 'test-domain.com'
        }),
      });
      
      debugInfo.steps.push('✅ Admin panel connection successful');
      debugInfo.adminConnection = 'SUCCESS';
      debugInfo.adminPanelUrl = adminPanelUrl;
    } catch (connectionError: any) {
      debugInfo.steps.push('❌ Admin panel connection failed');
      debugInfo.adminConnection = 'FAILED';
      debugInfo.connectionError = {
        message: connectionError.message
      };
      return NextResponse.json(debugInfo, { status: 500 });
    }

    // Search for license key via admin panel
    try {
      debugInfo.steps.push('🔍 Searching for license key via admin panel...');
      
      const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'https://flower-delivery-final-admin.vercel.app';
      const verifyUrl = `${adminPanelUrl}/api/saas/verify-license`;
      
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey,
          domain
        }),
      });

      debugInfo.adminApiResponse = {
        status: response.status,
        ok: response.ok
      };

      if (!response.ok) {
        debugInfo.steps.push('❌ License key not found or invalid');
        debugInfo.licenseFound = false;
        
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response might not be JSON
        }
        
        debugInfo.adminError = errorMessage;
        return NextResponse.json(debugInfo, { status: 404 });
      }

      const result = await response.json();
      debugInfo.steps.push('✅ License key found via admin panel');
      debugInfo.licenseFound = true;
      debugInfo.adminResult = result;

      if (result.valid) {
        debugInfo.steps.push('✅ All validations passed');
        debugInfo.result = 'SUCCESS';
        debugInfo.globallyVerified = true; // If admin panel says valid, consider it verified
      } else {
        debugInfo.steps.push('❌ License validation failed');
        debugInfo.result = 'FAILED';
      }

      return NextResponse.json(debugInfo);

    } catch (queryError: any) {
      debugInfo.steps.push('❌ Admin panel query failed');
      debugInfo.queryError = {
        message: queryError.message,
        stack: queryError.stack
      };
      return NextResponse.json(debugInfo, { status: 500 });
    }

  } catch (error: any) {
    console.error('DEBUG: License debug error:', error);
    
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}