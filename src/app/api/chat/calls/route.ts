import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { twilioCallSessions, chatConversations } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/chat/calls?conversationId=xxx - Get call history for a conversation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Verify user has access to this conversation
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          // User should be either the customer or the driver
        )
      )
      .limit(1);

    if (!conversation.length) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversation[0];

    // Check if user is part of this conversation
    if (conversationData.customerId !== session.user.id && conversationData.driverId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get call sessions for this conversation
    const calls = await db
      .select()
      .from(twilioCallSessions)
      .where(eq(twilioCallSessions.conversationId, conversationId))
      .orderBy(desc(twilioCallSessions.createdAt));

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Error fetching call history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat/calls - Initiate a new call
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, callType = 'voice' } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    if (!['voice', 'video'].includes(callType)) {
      return NextResponse.json({ error: 'Invalid call type' }, { status: 400 });
    }

    // Verify user has access to this conversation
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conversation.length) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversation[0];

    // Check if user is part of this conversation
    if (conversationData.customerId !== session.user.id && conversationData.driverId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const callerId = session.user.id;
    const otherParty = conversationData.customerId === session.user.id
      ? conversationData.driverId
      : conversationData.customerId;

    // For support conversations (driverId is null), use 'support_team' so any admin can pick up
    const receiverId = otherParty || 'support_team';

    // Check if there's already an active call in this conversation
    const activeCall = await db
      .select()
      .from(twilioCallSessions)
      .where(
        and(
          eq(twilioCallSessions.conversationId, conversationId),
          eq(twilioCallSessions.status, 'ringing')
        )
      )
      .limit(1);

    if (activeCall.length > 0) {
      return NextResponse.json({ error: 'Call already in progress' }, { status: 400 });
    }

    const callId = uuidv4();
    await db.insert(twilioCallSessions).values({
      id: callId,
      conversationId,
      callerId,
      receiverId,
      callType,
      status: 'ringing',
      createdAt: new Date(),
    });

    const newCall = await db
      .select()
      .from(twilioCallSessions)
      .where(eq(twilioCallSessions.id, callId))
      .limit(1);

    return NextResponse.json(newCall[0]);
  } catch (error) {
    console.error('Error initiating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}