import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatConversations, orders } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// POST /api/orders/[orderId]/chat - Create or get chat conversation for an order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;

    // Check if order exists and user has access to it
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order[0];

    // Check if user has access to this order (either customer or assigned driver)
    const userHasAccess = orderData.userId === session.user.id || 
                         orderData.assignedDriverId === session.user.id;

    if (!userHasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if order is active (not completed)
    if (orderData.status === 'delivered' || orderData.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot chat for completed orders' }, { status: 400 });
    }

    if (!orderData.assignedDriverId) {
      return NextResponse.json({ error: 'No driver assigned to this order yet' }, { status: 400 });
    }

    // Check if conversation already exists for this order
    const existingConversation = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.orderId, orderId))
      .limit(1);

    if (existingConversation.length > 0) {
      return NextResponse.json({
        conversation: existingConversation[0],
        isNew: false
      });
    }

    // Create new conversation
    const conversationId = uuidv4();
    await db.insert(chatConversations).values({
      id: conversationId,
      orderId: orderId,
      customerId: orderData.userId!,
      driverId: orderData.assignedDriverId!,
      agoraChannelName: `chat_${conversationId}`,
      isActive: true,
    });

    // Fetch the created conversation
    const newConversation = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    return NextResponse.json({
      conversation: newConversation[0],
      isNew: true
    });
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/orders/[orderId]/chat - Get existing chat conversation for an order
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

    // Check if order exists and user has access to it
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
    const userHasAccess = orderData.userId === session.user.id || 
                         orderData.assignedDriverId === session.user.id;

    if (!userHasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get conversation for this order
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.orderId, orderId))
      .limit(1);

    if (!conversation.length) {
      return NextResponse.json({ conversation: null });
    }

    return NextResponse.json({ conversation: conversation[0] });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}