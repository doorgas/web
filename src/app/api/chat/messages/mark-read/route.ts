import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, chatConversations } from '@/lib/schema';
import { eq, and, or, ne } from 'drizzle-orm';

// PUT - Mark messages as read in a conversation
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await request.json();
    const userId = session.user.id;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Verify user is part of this conversation
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          or(
            eq(chatConversations.customerId, userId),
            eq(chatConversations.driverId, userId)
          )
        )
      )
      .limit(1);

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Mark all messages in this conversation as read (except messages sent by current user)
    const result = await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          or(
            // Messages from other users
            ne(chatMessages.senderId, userId),
            // Messages from support bot (null sender)
            eq(chatMessages.senderKind, 'support_bot')
          )
        )
      );

    return NextResponse.json({ 
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}