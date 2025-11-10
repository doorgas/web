import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, drivers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/orders/[orderId] - Get specific order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;

    // Get the order details
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order[0];

    // Check if user has access to this order
    let hasAccess = false;
    
    if (orderData.userId === session.user.id) {
      // User is the customer
      hasAccess = true;
    } else {
      // Check if user is a driver assigned to this order
      const driver = await db
        .select()
        .from(drivers)
        .where(eq(drivers.userId, session.user.id))
        .limit(1);
      
      if (driver.length > 0 && driver[0].id === orderData.assignedDriverId) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(orderData);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}