import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';

// GET - Fetch order settings
export async function GET() {
  try {
    const orderSettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, 'order_minimum_order_value'),
          eq(settings.key, 'order_delivery_fee'),
          eq(settings.key, 'order_shipping_fee')
        )
      );

    // Convert to key-value object for easier use
    const settingsObj = orderSettings.reduce((acc, setting) => {
      let value: any = setting.value;
      
      // Parse numeric values
      if (setting.type === 'number' || setting.key.includes('fee') || setting.key.includes('value')) {
        value = parseFloat(setting.value) || 0;
      } else if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'json') {
        try {
          value = JSON.parse(setting.value);
        } catch (e) {
          console.warn(`Failed to parse JSON for setting ${setting.key}:`, e);
        }
      }
      
      acc[setting.key] = value;
      return acc;
    }, {} as Record<string, any>);

    // Return with default values if settings don't exist
    return NextResponse.json({
      minimumOrderValue: settingsObj.order_minimum_order_value || 0,
      deliveryFee: settingsObj.order_delivery_fee || 0,
      shippingFee: settingsObj.order_shipping_fee || 0
    });
  } catch (error) {
    console.error('Error fetching order settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
