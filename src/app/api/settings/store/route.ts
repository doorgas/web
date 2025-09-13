import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch store settings (read-only, no PUT method since form is removed)
export async function GET() {
  try {
    const storeSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.isActive, true));

    // Convert to key-value object for easier use
    const settingsObj = storeSettings.reduce((acc, setting) => {
      let value: any = setting.value;
      
      // Parse JSON values
      if (setting.type === 'json') {
        try {
          value = JSON.parse(setting.value);
        } catch (e) {
          console.warn(`Failed to parse JSON for setting ${setting.key}:`, e);
        }
      } else if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'number') {
        value = parseFloat(setting.value);
      }
      
      acc[setting.key] = value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
