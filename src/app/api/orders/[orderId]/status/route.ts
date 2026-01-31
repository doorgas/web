import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, userLoyaltyPoints, loyaltyPointsHistory } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Check if database configuration is available
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    const { status, deliveryStatus } = await request.json();

    console.log(`\n=== ORDER STATUS UPDATE ===`);
    console.log(`Order: ${orderId}, New Status: ${status}, Delivery Status: ${deliveryStatus}`);

    // Update order status
    await db.update(orders)
      .set({
        status: status || undefined,
        deliveryStatus: deliveryStatus || undefined,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));

    // If order is completed or delivered, make pending points available
    if (status === 'completed' || deliveryStatus === 'delivered') {
      console.log(`Order completed/delivered - updating loyalty points...`);
      
      // Get order details
      const orderData = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (orderData.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const order = orderData[0];
      const userId = order.userId;

      if (!userId) {
        console.log('No user ID in order, skipping points update');
        return NextResponse.json({ 
          success: true, 
          message: 'Order status updated (no user to update points)' 
        });
      }

      // Update pending points to available
      const pendingPoints = await db
        .select()
        .from(loyaltyPointsHistory)
        .where(
          and(
            eq(loyaltyPointsHistory.userId, userId),
            eq(loyaltyPointsHistory.orderId, orderId),
            eq(loyaltyPointsHistory.transactionType, 'earned'),
            eq(loyaltyPointsHistory.status, 'pending')
          )
        );

      if (pendingPoints.length > 0) {
        const totalPendingPoints = pendingPoints.reduce((sum, p) => sum + p.points, 0);
        
        // Update history records to available
        await db.update(loyaltyPointsHistory)
          .set({ 
            status: 'available',
            createdAt: new Date() // Update timestamp when made available
          })
          .where(
            and(
              eq(loyaltyPointsHistory.userId, userId),
              eq(loyaltyPointsHistory.orderId, orderId),
              eq(loyaltyPointsHistory.transactionType, 'earned'),
              eq(loyaltyPointsHistory.status, 'pending')
            )
          );

        // Update user's available points
        const currentUserPoints = await db
          .select()
          .from(userLoyaltyPoints)
          .where(eq(userLoyaltyPoints.userId, userId))
          .limit(1);

        if (currentUserPoints.length > 0) {
          const newAvailablePoints = (currentUserPoints[0].availablePoints || 0) + totalPendingPoints;
          const newPendingPoints = Math.max(0, (currentUserPoints[0].pendingPoints || 0) - totalPendingPoints);
          
          await db.update(userLoyaltyPoints)
            .set({
              availablePoints: newAvailablePoints,
              pendingPoints: newPendingPoints, // Reducess pending points
              updatedAt: new Date()
            })
            .where(eq(userLoyaltyPoints.userId, userId));

          console.log(`✅ Made ${totalPendingPoints} pending points available for user ${userId}`);
          console.log(`New available points balance: ${newAvailablePoints}`);
          console.log(`New pending points balance: ${newPendingPoints}`);
        }
      }
    }

    console.log(`=== END ORDER STATUS UPDATE ===\n`);

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update order status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}