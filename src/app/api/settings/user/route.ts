import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch user data for settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await db
      .select({
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        postalCode: user.postalCode,
        latitude: user.latitude,
        longitude: user.longitude,
        notifyOrderUpdates: user.notifyOrderUpdates,
        notifyPromotions: user.notifyPromotions,
        notifyDriverMessages: user.notifyDriverMessages
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userData[0]);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user profile and notification settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      notifications
    } = body;

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only update profile fields if they are provided
    if (name !== undefined) updateData.name = name;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

    // Handle notification preferences
    if (notifications) {
      if (notifications.orderUpdates !== undefined) {
        updateData.notifyOrderUpdates = notifications.orderUpdates ? 1 : 0;
      }
      if (notifications.promotions !== undefined) {
        updateData.notifyPromotions = notifications.promotions ? 1 : 0;
      }
      if (notifications.driverMessages !== undefined) {
        updateData.notifyDriverMessages = notifications.driverMessages ? 1 : 0;
      }
    }

    await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}