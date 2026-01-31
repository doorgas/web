import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { twilioCallSessions, chatConversations } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// PATCH /api/chat/calls/[callId] - Update call status (answer, end, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await params;
    const { status, duration } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['ringing', 'answered', 'ended', 'missed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get the call session
    const call = await db
      .select()
      .from(twilioCallSessions)
      .where(eq(twilioCallSessions.id, callId))
      .limit(1);

    if (!call.length) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const callData = call[0];

    // Verify user has access to this call
    if (callData.callerId !== session.user.id && callData.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      ...(status === 'answered' && { startedAt: new Date() }),
      ...(status === 'ended' && { 
        endedAt: new Date(),
        ...(duration && { duration })
      }),
      ...(status === 'missed' && { endedAt: new Date() }),
    };

    // Update call session
    await db
      .update(twilioCallSessions)
      .set(updateData)
      .where(eq(twilioCallSessions.id, callId));

    // Fetch updated call
    const updatedCall = await db
      .select()
      .from(twilioCallSessions)
      .where(eq(twilioCallSessions.id, callId))
      .limit(1);

    return NextResponse.json(updatedCall[0]);
  } catch (error) {
    console.error('Error updating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/chat/calls/[callId] - Get specific call details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await params;

    // Get the call session with conversation details
    const call = await db
      .select({
        id: twilioCallSessions.id,
        conversationId: twilioCallSessions.conversationId,
        callerId: twilioCallSessions.callerId,
        receiverId: twilioCallSessions.receiverId,
        callType: twilioCallSessions.callType,
        status: twilioCallSessions.status,
        startedAt: twilioCallSessions.startedAt,
        endedAt: twilioCallSessions.endedAt,
        duration: twilioCallSessions.duration,
        createdAt: twilioCallSessions.createdAt,
        orderId: chatConversations.orderId,
      })
      .from(twilioCallSessions)
      .leftJoin(chatConversations, eq(twilioCallSessions.conversationId, chatConversations.id))
      .where(eq(twilioCallSessions.id, callId))
      .limit(1);

    if (!call.length) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const callData = call[0];

    // Verify user has access to this call
    if (callData.callerId !== session.user.id && callData.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(callData);
  } catch (error) {
    console.error('Error fetching call details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}