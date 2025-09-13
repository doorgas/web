import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pickupLocations } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Only fetch active pickup locations for customers
    const locations = await db
      .select()
      .from(pickupLocations)
      .where(eq(pickupLocations.isActive, true))
      .orderBy(desc(pickupLocations.createdAt));
    
    return NextResponse.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Error fetching pickup locations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch pickup locations' 
      }, 
      { status: 500 }
    );
  }
}
