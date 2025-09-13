import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, drivers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get driver information
    const driverData = await db
      .select({
        id: drivers.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: drivers.status,
        vehicleType: drivers.vehicleType,
        vehiclePlateNumber: drivers.vehiclePlateNumber,
        baseLocation: drivers.baseLocation,
        currentLatitude: drivers.currentLatitude,
        currentLongitude: drivers.currentLongitude,
        currentAddress: drivers.currentAddress,
      })
      .from(drivers)
      .innerJoin(user, eq(drivers.userId, user.id))
      .where(eq(drivers.userId, userId))
      .limit(1);

    if (driverData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    const driver = driverData[0];

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        name: driver.name || '',
        email: driver.email || '',
        phone: driver.phone || '',
        status: driver.status || 'offline',
        vehicleType: driver.vehicleType || '',
        vehiclePlateNumber: driver.vehiclePlateNumber || '',
        baseLocation: driver.baseLocation || '',
        currentLatitude: driver.currentLatitude ? parseFloat(driver.currentLatitude.toString()) : undefined,
        currentLongitude: driver.currentLongitude ? parseFloat(driver.currentLongitude.toString()) : undefined,
        currentAddress: driver.currentAddress || '',
      }
    });

  } catch (error) {
    console.error('Error fetching driver info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch driver information' },
      { status: 500 }
    );
  }
}