import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drivers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, latitude, longitude, address } = body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'User ID, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude must be numbers' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Update driver location
    const result = await db
      .update(drivers)
      .set({ 
        currentLatitude: latitude.toString(),
        currentLongitude: longitude.toString(),
        currentAddress: address || `${latitude}, ${longitude}`,
        updatedAt: new Date()
      })
      .where(eq(drivers.userId, userId));

    return NextResponse.json({
      success: true,
      message: 'Driver location updated successfully',
      location: {
        latitude,
        longitude,
        address: address || `${latitude}, ${longitude}`
      }
    });

  } catch (error) {
    console.error('Error updating driver location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update driver location' },
      { status: 500 }
    );
  }
}