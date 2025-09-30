import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin-db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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
    
    console.log('Global license setup:', { 
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
    
    // Find the client with this license key in the admin database
    try {
      const client = await adminDb
        .select({
          id: saasClients.id,
          status: saasClients.status,
          subscriptionStatus: saasClients.subscriptionStatus,
          subscriptionEndDate: saasClients.subscriptionEndDate,
          websiteDomain: saasClients.websiteDomain,
          licenseVerified: saasClients.licenseVerified,
        })
        .from(saasClients)
        .where(eq(saasClients.licenseKey, licenseKey))
        .limit(1);

      if (client.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid license key'
        }, { status: 401 });
      }

      const clientData = client[0];

      // Check if client is suspended or cancelled
      if (clientData.status !== 'active') {
        return NextResponse.json({
          success: false,
          error: `License is ${clientData.status}`
        }, { status: 403 });
      }

      // Check domain match (strict - no subdomains allowed)
      const clientDomain = extractDomain(clientData.websiteDomain);
      
      if (requestDomain !== clientDomain) {
        return NextResponse.json({
          success: false,
          error: `Domain not authorized for this license. Expected: ${clientDomain}, Got: ${requestDomain}`
        }, { status: 403 });
      }

      // Check subscription status and expiry
      if (clientData.subscriptionStatus !== 'active') {
        return NextResponse.json({
          success: false,
          error: `Subscription is ${clientData.subscriptionStatus}`
        }, { status: 402 });
      }

      // Check subscription expiry (skip check if lifetime subscription)
      if (clientData.subscriptionEndDate) {
        const now = new Date();
        const expiryDate = new Date(clientData.subscriptionEndDate);
        
        if (now > expiryDate) {
          return NextResponse.json({
            success: false,
            error: 'Subscription has expired'
          }, { status: 402 });
        }
      }

      // Update the license as globally verified
      await adminDb
        .update(saasClients)
        .set({ 
          licenseVerified: 'yes',
          lastVerificationDate: new Date(),
          lastAccessDate: new Date(),
        })
        .where(eq(saasClients.id, clientData.id));

      console.log('License globally verified and database updated for client:', clientData.id);

      return NextResponse.json({
        success: true,
        message: 'License activated globally'
      });

    } catch (dbError) {
      console.error('Database error in global license setup:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Unable to setup license - database connection failed'
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