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
    const { licenseKey, domain } = body;
    
    console.log('Global license setup via admin API:', { 
      licenseKey: licenseKey?.substring(0, 10) + '...', 
      domain 
    });

    if (!licenseKey || !domain) {
      return NextResponse.json({
        success: false,
        error: 'License key and domain are required'
      }, { status: 400 });
    }

    const requestDomain = extractDomain(domain);
    
    try {
      // Call admin panel API to verify and mark license as globally verified
      const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'https://flower-delivery-final-admin.vercel.app';
      const url = `${adminPanelUrl}/api/saas/verify-license`;
      
      console.log('Calling admin panel for license verification and global setup:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey,
          domain: requestDomain,
          setGloballyVerified: true // Special flag to mark as globally verified
        }),
      });

      if (!response.ok) {
        let errorMessage = `License verification failed`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response might not be JSON
        }
        
        return NextResponse.json({
          success: false,
          error: errorMessage
        }, { status: response.status });
      }

      const result = await response.json();
      
      if (result.valid) {
        console.log('License globally verified via admin panel');
        return NextResponse.json({
          success: true,
          message: 'License activated globally'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'License verification failed'
        }, { status: 400 });
      }

    } catch (apiError) {
      console.error('Admin panel API error during global setup:', apiError);
      return NextResponse.json({
        success: false,
        error: 'Unable to setup license - admin panel connection failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Global license setup error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error during license setup'
    }, { status: 500 });
  }
}