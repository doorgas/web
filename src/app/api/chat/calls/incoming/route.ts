import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { twilioCallSessions, user } from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ringingCalls = await db
      .select({
        id: twilioCallSessions.id,
        conversationId: twilioCallSessions.conversationId,
        callerId: twilioCallSessions.callerId,
        receiverId: twilioCallSessions.receiverId,
        status: twilioCallSessions.status,
        createdAt: twilioCallSessions.createdAt,
        callerName: user.name,
      })
      .from(twilioCallSessions)
      .leftJoin(user, eq(twilioCallSessions.callerId, user.id))
      .where(
        and(
          eq(twilioCallSessions.receiverId, session.user.id),
          or(
            eq(twilioCallSessions.status, 'ringing'),
            eq(twilioCallSessions.status, 'initiated')
          )
        )
      )
      .limit(1);

    return NextResponse.json({ call: ringingCalls[0] || null });
  } catch (error) {
    console.error('Error checking incoming calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
