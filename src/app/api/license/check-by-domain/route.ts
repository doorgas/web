import { NextRequest, NextResponse } from 'next/server';

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsedUrl.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;
    
    console.log('Checking license by domain via admin API:', domain);

    if (!domain) {
      return NextResponse.json({
        valid: false,
        error: 'Domain is required'
      }, { status: 400 });
    }

    const requestDomain = extractDomain(domain);
    
    try {
      // Call admin panel API to check license by domain
      const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'https://flower-delivery-final-admin.vercel.app';
      const url = `${adminPanelUrl}/api/saas/check-by-domain`;
      
      console.log('Calling admin panel API:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: requestDomain
        }),
      });

      if (!response.ok) {
        console.log('Admin panel API failed with status:', response.status);
        return NextResponse.json({
          valid: false,
          error: 'No license found for this domain'
        }, { status: 404 });
      }

      const adminResult = await response.json();
      
      // Forward the admin panel response
      return NextResponse.json({
        valid: adminResult.valid,
        globallyVerified: adminResult.globallyVerified,
        licenseKey: adminResult.licenseKey,
        client: adminResult.client,
        error: adminResult.error
      });

    } catch (apiError) {
      console.error('Admin panel API error:', apiError);
      return NextResponse.json({
        valid: false,
        error: 'Unable to verify license - admin panel connection failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Domain license check error:', error);
    
    return NextResponse.json({
      valid: false,
      error: 'Internal server error during license verification'
    }, { status: 500 });
  }
}