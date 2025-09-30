import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin-db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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
        ADMIN_DB_HOST: process.env.ADMIN_DB_HOST || 'NOT_SET',
        ADMIN_DB_USER: process.env.ADMIN_DB_USER || 'NOT_SET',
        ADMIN_DB_NAME: process.env.ADMIN_DB_NAME || 'NOT_SET',
        ADMIN_DB_PASS: process.env.ADMIN_DB_PASS ? 'SET' : 'NOT_SET',
        ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || 'NOT_SET'
      },
      steps: []
    };

    if (!licenseKey || !domain) {
      debugInfo.error = 'Missing license key or domain';
      debugInfo.steps.push('❌ Validation failed: Missing required parameters');
      return NextResponse.json(debugInfo, { status: 400 });
    }

    debugInfo.steps.push('✅ Input validation passed');

    // Test database connection
    try {
      debugInfo.steps.push('🔍 Testing database connection...');
      
      const testQuery = await adminDb
        .select({
          count: saasClients.id
        })
        .from(saasClients)
        .limit(1);
      
      debugInfo.steps.push('✅ Database connection successful');
      debugInfo.dbConnection = 'SUCCESS';
    } catch (dbError: any) {
      debugInfo.steps.push('❌ Database connection failed');
      debugInfo.dbConnection = 'FAILED';
      debugInfo.dbError = {
        message: dbError.message,
        code: dbError.code,
        errno: dbError.errno
      };
      return NextResponse.json(debugInfo, { status: 500 });
    }

    // Search for license key
    try {
      debugInfo.steps.push('🔍 Searching for license key in database...');
      
      const client = await adminDb
        .select({
          id: saasClients.id,
          companyName: saasClients.companyName,
          status: saasClients.status,
          subscriptionStatus: saasClients.subscriptionStatus,
          subscriptionEndDate: saasClients.subscriptionEndDate,
          websiteDomain: saasClients.websiteDomain,
          licenseVerified: saasClients.licenseVerified,
          licenseKey: saasClients.licenseKey
        })
        .from(saasClients)
        .where(eq(saasClients.licenseKey, licenseKey))
        .limit(1);

      if (client.length === 0) {
        debugInfo.steps.push('❌ License key not found in database');
        debugInfo.licenseFound = false;
        
        // Also search for similar license keys (for debugging)
        const similarLicenses = await adminDb
          .select({
            id: saasClients.id,
            licenseKey: saasClients.licenseKey
          })
          .from(saasClients)
          .limit(5);
        
        debugInfo.availableLicenses = similarLicenses.map(l => ({
          id: l.id,
          licenseKey: l.licenseKey?.substring(0, 10) + '...'
        }));
        
        return NextResponse.json(debugInfo, { status: 404 });
      }

      const clientData = client[0];
      debugInfo.steps.push('✅ License key found in database');
      debugInfo.licenseFound = true;
      debugInfo.clientData = {
        id: clientData.id,
        companyName: clientData.companyName,
        status: clientData.status,
        subscriptionStatus: clientData.subscriptionStatus,
        websiteDomain: clientData.websiteDomain,
        licenseVerified: clientData.licenseVerified,
        subscriptionEndDate: clientData.subscriptionEndDate
      };

      // Domain extraction and validation
      const extractDomain = (url: string): string => {
        try {
          const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
          return parsedUrl.hostname.toLowerCase();
        } catch {
          return url.toLowerCase();
        }
      };

      const requestDomain = extractDomain(domain);
      const clientDomain = extractDomain(clientData.websiteDomain);
      
      debugInfo.domainCheck = {
        requestDomain,
        clientDomain,
        match: requestDomain === clientDomain
      };

      if (requestDomain !== clientDomain) {
        debugInfo.steps.push('❌ Domain mismatch');
        return NextResponse.json(debugInfo, { status: 403 });
      }

      debugInfo.steps.push('✅ Domain validation passed');

      // Status checks
      if (clientData.status !== 'active') {
        debugInfo.steps.push(`❌ Client status is ${clientData.status}, not active`);
        return NextResponse.json(debugInfo, { status: 403 });
      }

      debugInfo.steps.push('✅ Client status is active');

      if (clientData.subscriptionStatus !== 'active') {
        debugInfo.steps.push(`❌ Subscription status is ${clientData.subscriptionStatus}, not active`);
        return NextResponse.json(debugInfo, { status: 402 });
      }

      debugInfo.steps.push('✅ Subscription status is active');

      // Subscription expiry check
      if (clientData.subscriptionEndDate) {
        const now = new Date();
        const expiryDate = new Date(clientData.subscriptionEndDate);
        
        debugInfo.subscriptionCheck = {
          now: now.toISOString(),
          expiryDate: expiryDate.toISOString(),
          expired: now > expiryDate
        };
        
        if (now > expiryDate) {
          debugInfo.steps.push('❌ Subscription has expired');
          return NextResponse.json(debugInfo, { status: 402 });
        }
      }

      debugInfo.steps.push('✅ All validations passed');
      debugInfo.result = 'SUCCESS';
      debugInfo.globallyVerified = clientData.licenseVerified === 'yes';

      return NextResponse.json(debugInfo);

    } catch (queryError: any) {
      debugInfo.steps.push('❌ Database query failed');
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