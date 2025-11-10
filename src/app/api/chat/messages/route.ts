import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, chatConversations, user } from '@/lib/schema';
import { eq, and, or, desc, gte, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET - Get messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const afterMessageId = searchParams.get('afterMessageId'); // For polling new messages

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

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

    // Get messages (only from the last week for automatic cleanup)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Build where conditions
    let whereConditions = and(
      eq(chatMessages.conversationId, conversationId),
      gte(chatMessages.createdAt, oneWeekAgo)
    );

    // If afterMessageId is provided, get only messages after that message
    if (afterMessageId) {
      // First get the timestamp of the afterMessageId
      const afterMessage = await db
        .select({ createdAt: chatMessages.createdAt })
        .from(chatMessages)
        .where(eq(chatMessages.id, afterMessageId))
        .limit(1);

      if (afterMessage.length > 0 && afterMessage[0].createdAt) {
        whereConditions = and(
          eq(chatMessages.conversationId, conversationId),
          gte(chatMessages.createdAt, oneWeekAgo),
          gt(chatMessages.createdAt, afterMessage[0].createdAt)
        );
      }
    }

    const rawMessages = await db
      .select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderId: chatMessages.senderId,
        senderKind: chatMessages.senderKind,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        isRead: chatMessages.isRead,
        createdAt: chatMessages.createdAt,
        senderName: user.name,
        senderEmail: user.email,
      })
      .from(chatMessages)
      .leftJoin(user, eq(user.id, chatMessages.senderId))
      .where(whereConditions)
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Handle different sender kinds
    const messages = rawMessages.map(msg => ({
      ...msg,
      senderName: msg.senderKind === 'support_bot' ? 'Support Team' : (msg.senderName || 'Unknown'),
      senderEmail: msg.senderKind === 'support_bot' ? 'support@company.com' : (msg.senderEmail || ''),
    }));

    return NextResponse.json({ messages: messages.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message, messageType = 'text' } = await request.json();
    const senderId = session.user.id;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Conversation ID and message are required' },
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
            eq(chatConversations.customerId, senderId),
            eq(chatConversations.driverId, senderId)
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

    // Create new message
    const messageId = uuidv4();
    const newMessage = {
      id: messageId,
      conversationId,
      senderId,
      senderKind: 'user',
      message,
      messageType,
      isRead: false,
      createdAt: new Date(),
    };

    await db.insert(chatMessages).values(newMessage);

    // Update conversation's last message timestamp
    await db
      .update(chatConversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatConversations.id, conversationId));

    // Get the created message with sender info
    const rawCreatedMessage = await db
      .select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderId: chatMessages.senderId,
        senderKind: chatMessages.senderKind,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        isRead: chatMessages.isRead,
        createdAt: chatMessages.createdAt,
        senderName: user.name,
        senderEmail: user.email,
      })
      .from(chatMessages)
      .leftJoin(user, eq(user.id, chatMessages.senderId))
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    // Handle different sender kinds
    const createdMessage = {
      ...rawCreatedMessage[0],
      senderName: rawCreatedMessage[0].senderKind === 'support_bot' ? 'Support Team' : (rawCreatedMessage[0].senderName || 'Unknown'),
      senderEmail: rawCreatedMessage[0].senderKind === 'support_bot' ? 'support@company.com' : (rawCreatedMessage[0].senderEmail || ''),
    };

    return NextResponse.json({ message: createdMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}