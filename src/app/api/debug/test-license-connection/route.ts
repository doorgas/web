import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
    const testUrl = `${adminPanelUrl}/api/saas/verify-license`;
    
    console.log('Testing connection to:', testUrl);
    
    // Test with a dummy license key
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: 'TEST-KEY',
        domain: 'test.com'
      }),
    });
    
    const responseText = await response.text();
    
    return NextResponse.json({
      success: true,
      adminPanelUrl,
      testUrl,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.substring(0, 500) // Limit response size
    });
    
  } catch (error) {
    console.error('Connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      adminPanelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:3000'
    }, { status: 500 });
  }
}