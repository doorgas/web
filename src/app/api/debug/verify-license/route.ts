import { NextRequest, NextResponse } from 'next/server';
import { verifyLicense } from '@/lib/license';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, domain } = body;
    
    console.log('Debug license verification:', { licenseKey: licenseKey?.substring(0, 10) + '...', domain });
    
    const result = await verifyLicense(licenseKey, domain);
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug license verification failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}