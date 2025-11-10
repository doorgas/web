import { NextRequest, NextResponse } from 'next/server';
import { getTravelTimeEstimate } from '@/lib/maps-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const originLat = searchParams.get('originLat');
    const originLng = searchParams.get('originLng');
    const destLat = searchParams.get('destLat');
    const destLng = searchParams.get('destLng');

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { success: false, error: 'Origin and destination coordinates are required' },
        { status: 400 }
      );
    }

    const origin = {
      latitude: parseFloat(originLat),
      longitude: parseFloat(originLng)
    };

    const destination = {
      latitude: parseFloat(destLat),
      longitude: parseFloat(destLng)
    };

    // Validate coordinates
    if (
      isNaN(origin.latitude) || isNaN(origin.longitude) ||
      isNaN(destination.latitude) || isNaN(destination.longitude)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates provided' },
        { status: 400 }
      );
    }

    if (
      Math.abs(origin.latitude) > 90 || Math.abs(origin.longitude) > 180 ||
      Math.abs(destination.latitude) > 90 || Math.abs(destination.longitude) > 180
    ) {
      return NextResponse.json(
        { success: false, error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    const travelTime = await getTravelTimeEstimate(origin, destination);

    if (!travelTime) {
      return NextResponse.json(
        { success: false, error: 'Unable to calculate travel time' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      travelTime: {
        duration: travelTime.duration,
        durationValue: travelTime.durationValue,
        distance: travelTime.distance,
        distanceValue: travelTime.distanceValue,
        estimatedArrivalTime: new Date(Date.now() + (travelTime.durationValue * 1000)).toISOString()
      }
    });

  } catch (error) {
    console.error('Error in travel-time API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate travel time' },
      { status: 500 }
    );
  }
}