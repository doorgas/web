import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';

// GET - Fetch shipping settings
export async function GET() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.log('Database not configured, assuming shipping is enabled');
      return NextResponse.json({
        enabled: true,
        message: 'Shipping is currently available for all orders.',
        timestamp: new Date().toISOString()
      });
    }

    // Get shipping settings from database
    const shippingSettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, 'shipping_enabled'),
          eq(settings.key, 'shipping_message')
        )
      );

    let shippingEnabled = true; // Default to enabled
    let customMessage = 'Shipping is currently available for all orders.'; // Default message

    // Parse existing settings
    shippingSettings.forEach(setting => {
      if (setting.key === 'shipping_enabled') {
        try {
          shippingEnabled = setting.value === 'true';
        } catch (error) {
          console.error('Error parsing shipping enabled setting:', error);
        }
      } else if (setting.key === 'shipping_message') {
        customMessage = setting.value || customMessage;
      }
    });

    return NextResponse.json({
      enabled: shippingEnabled,
      message: customMessage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching shipping status from database:', error);
    // Return default enabled state in case of error to avoid breaking checkout
    return NextResponse.json({
      enabled: true,
      message: 'Shipping is currently available for all orders.',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch current settings'
    });
  }
}
