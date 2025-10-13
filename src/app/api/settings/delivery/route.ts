import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';

// GET - Fetch delivery settings
export async function GET() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.log('Database not configured, assuming delivery is enabled');
      return NextResponse.json({
        enabled: true,
        message: 'Delivery is currently available for all orders.',
        timestamp: new Date().toISOString()
      });
    }

    // Get delivery settings from database
    const deliverySettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, 'delivery_enabled'),
          eq(settings.key, 'delivery_message')
        )
      );

    let deliveryEnabled = true; // Default to enabled
    let customMessage = 'Delivery is currently available for all orders.'; // Default message

    // Parse existing settings
    deliverySettings.forEach(setting => {
      if (setting.key === 'delivery_enabled') {
        try {
          deliveryEnabled = setting.value === 'true';
        } catch (error) {
          console.error('Error parsing delivery enabled setting:', error);
        }
      } else if (setting.key === 'delivery_message') {
        customMessage = setting.value || customMessage;
      }
    });

    return NextResponse.json({
      enabled: deliveryEnabled,
      message: customMessage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching delivery status from database:', error);
    // Return default enabled state in case of error to avoid breaking checkout
    return NextResponse.json({
      enabled: true,
      message: 'Delivery is currently available for all orders.',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch current settings'
    });
  }
}
