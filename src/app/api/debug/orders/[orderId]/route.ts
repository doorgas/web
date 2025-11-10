import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get the order and its items with raw data
    const orderData = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const itemsData = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    if (orderData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Return raw data for debugging
    return NextResponse.json({
      success: true,
      debug: {
        order: orderData[0],
        items: itemsData.map(item => ({
          id: item.id,
          productName: item.productName,
          variantTitle: item.variantTitle,
          sku: item.sku,
          addons: item.addons,
          addonsType: typeof item.addons,
          addonsStringified: JSON.stringify(item.addons),
          rawItem: item
        }))
      }
    });

  } catch (error) {
    console.error('Error debugging order:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to debug order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
