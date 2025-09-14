import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json({
        success: false,
        error: 'Domain is required'
      }, { status: 400 });
    }

    const adminPanelUrl = process.env.ADMIN_PANEL_URL || process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || 'http://localhost:3000';
    const url = `${adminPanelUrl}/api/saas/check-domain`;

    console.log('Checking domain in admin database:', { domain, adminPanelUrl });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Admin panel responded with status ${response.status}: ${errorText}`,
        status: response.status
      });
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('Domain check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
