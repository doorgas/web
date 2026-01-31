import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages, chatConversations } from '@/lib/schema';
import { lt, and, eq, isNull } from 'drizzle-orm';

// POST - Clean up old messages (older than 1 week)
export async function POST(request: NextRequest) {
  try {
    // Mark old conversations without orderIds as inactive (for migration to order-based system)
    const oldConversationsUpdate = await db
      .update(chatConversations)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(isNull(chatConversations.orderId));

    console.log('Marked conversations without orderIds as inactive');

    // Calculate date 1 week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Delete messages older than 1 week
    const deletedMessages = await db
      .delete(chatMessages)
      .where(lt(chatMessages.createdAt, oneWeekAgo));

    // Update conversations that no longer have messages
    const conversationsWithoutMessages = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .leftJoin(chatMessages, eq(chatMessages.conversationId, chatConversations.id))
      .where(isNull(chatMessages.id));

    // Mark conversations as inactive if they have no messages
    if (conversationsWithoutMessages.length > 0) {
      await db
        .update(chatConversations)
        .set({ isActive: false })
        .where(
          and(
            ...conversationsWithoutMessages.map(conv => eq(chatConversations.id, conv.id))
          )
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      inactiveConversations: conversationsWithoutMessages.length,
      deactivatedOldConversations: 'Conversations without orderIds marked as inactive',
    });
  } catch (error) {
    console.error('Error cleaning up chat messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}