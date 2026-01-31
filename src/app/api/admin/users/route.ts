import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/../drizzle/schema';
import crypto from 'crypto';
import { gte, like, gt, and, asc } from 'drizzle-orm';

function verifyHmac(req: NextRequest) {
  try {
    const sig = req.headers.get('x-signature') ?? '';
    const ts = req.headers.get('x-timestamp') ?? '';
    const body = ''; // GET with empty body; include body for POST
    const secret = process.env.ADMIN_API_SECRET!;
    
    if (!secret || !sig || !ts) {
      console.log('Missing required HMAC parameters:', { secret: !!secret, sig: !!sig, ts: !!ts });
      return false;
    }

    // Check timestamp is within 5 minutes
    const requestTime = parseInt(ts);
    const now = Date.now();
    if (Math.abs(now - requestTime) > 300000) { // 5 minutes
      console.log('Request timestamp too old:', { requestTime, now, diff: Math.abs(now - requestTime) });
      return false;
    }

    const base = `${ts}:${req.nextUrl.pathname}:${req.nextUrl.search}:${body}`;
    const expected = crypto.createHmac('sha256', secret).update(base).digest('hex');
    
    const isValid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!isValid) {
      console.log('HMAC verification failed:', { expected, received: sig, base });
    }
    
    return isValid;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  console.log('Admin users API called:', req.nextUrl.toString());
  
  if (!verifyHmac(req)) {
    console.log('HMAC verification failed for admin users API');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200);
    const cursor = req.nextUrl.searchParams.get('cursor'); // last user id or createdAt
    const q = req.nextUrl.searchParams.get('q')?.trim();
    const updatedSince = req.nextUrl.searchParams.get('updated_since');

    console.log('Query parameters:', { limit, cursor, q, updatedSince });

    // Build the base query
    const selectFields = {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      city: user.city,
      address: user.address,
      state: user.state,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Don't include sensitive fields like passwords, OTP, etc.
    };

    // Build conditions array
    const conditions = [];

    if (cursor) {
      conditions.push(gt(user.id, cursor));
    }
    
    if (q) {
      conditions.push(like(user.email, `%${q}%`));
    }
    
    if (updatedSince) {
      conditions.push(gte(user.updatedAt, updatedSince));
    }

    // Execute query based on whether we have conditions
    let rows;
    if (conditions.length > 0) {
      rows = await db
        .select(selectFields)
        .from(user)
        .where(and(...conditions))
        .orderBy(asc(user.id))
        .limit(limit);
    } else {
      rows = await db
        .select(selectFields)
        .from(user)
        .orderBy(asc(user.id))
        .limit(limit);
    }
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;

    console.log('Retrieved users:', { count: rows.length, nextCursor });

    return NextResponse.json({ 
      data: rows, 
      nextCursor,
      pagination: {
        limit,
        hasMore: !!nextCursor
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}