import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// API endpoint to update delivery status only
// Does NOT automatically change the main order status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, deliveryStatus, driverId, deliveryTime } = body;

    if (!orderId || !deliveryStatus) {
      return NextResponse.json(
        { success: false, error: 'Order ID and delivery status are required' },
        { status: 400 }
      );
    }

    // Validate delivery status
    const validStatuses = ['pending', 'assigned', 'out_for_delivery', 'delivered', 'failed'];
    if (!validStatuses.includes(deliveryStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid delivery status' },
        { status: 400 }
      );
    }

    // Store delivery time as text (no conversion needed)
    let calculatedDeliveryTime = null;
    if (deliveryTime && deliveryTime.trim()) {
      calculatedDeliveryTime = deliveryTime.trim();
    }

    // Only update delivery status, not the main order status
    const updateData: any = {
      deliveryStatus,
      updatedAt: new Date()
    };

    if (calculatedDeliveryTime) {
      updateData.deliveryTime = calculatedDeliveryTime;
    }

    const result = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      message: `Delivery status updated to ${deliveryStatus}`,
      deliveryStatus: deliveryStatus
    });

  } catch (error) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update delivery status' },
      { status: 500 }
    );
  }
}