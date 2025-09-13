import { NextResponse } from 'next/server';
//import { z } from 'zod';
import { randomInt } from 'crypto';
import { db } from '@/lib/db';
//import { user } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
//import { v4 as uuidv4 } from 'uuid';
import { sendTextEmail } from '@/lib/email';
import { verification_tokens } from '@/lib/schema';

export async function POST(req: Request) {
  const { to, subject, message } = await req.json();

  // Generate a 6-digit OTP code
  const otp = randomInt(100000, 999999).toString();
  // Generate a random token (for magic link)
  const token = (Math.random() + 1).toString(36).substring(2);

  // Hash both for storage
  const hashedOtp = await bcrypt.hash(otp, 10);
  const hashedToken = await bcrypt.hash(token, 10);

   // Expiration time (15 minutes from now)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const verificationLink = `${process.env.NEXTAUTH_URL}/verify-otp?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}`;

   // Upsert: replace any existing token for this email
  await db.delete(verification_tokens).where(eq(verification_tokens.identifier, to));
  await db.insert(verification_tokens).values({ identifier: to, token: hashedToken, otp: hashedOtp, expires: expiresAt });

  const emailMessage = `Your OTP is: ${otp}`;

  if (!to || !subject) {
    return NextResponse.json({ error: 'Missing required fields (to, subject)' }, { status: 400 });
  }

  try {
    await sendTextEmail(to, subject, emailMessage);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
