import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { randomInt } from 'crypto';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { verification_tokens } from '@/lib/schema';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+12154349254';

if (!accountSid || !authToken) {
  console.error('Twilio credentials are missing from environment variables');
}

const client = twilio(accountSid, authToken);

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials are not configured' },
        { status: 500 }
      );
    }

    // Generate a 6-digit OTP code
    const otp = randomInt(100000, 999999).toString();
    // Generate a random token (for magic link)
    const token = (Math.random() + 1).toString(36).substring(2);

    // Hash both for storage
    const hashedOtp = await bcrypt.hash(otp, 10);
    const hashedToken = await bcrypt.hash(token, 10);

    // Expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Upsert: replace any existing token for this phone number
    await db.delete(verification_tokens).where(eq(verification_tokens.identifier, to));
    await db.insert(verification_tokens).values({ 
      identifier: to, 
      token: hashedToken, 
      otp: hashedOtp, 
      expires: expiresAt 
    });

    // Create SMS message with OTP
    const smsMessage = `Your verification code is: ${otp}`;

    const twilioMessage = await client.messages.create({
      body: smsMessage,
      from: twilioPhoneNumber,
      to: to,
    });

    console.log('SMS sent successfully:', twilioMessage.sid);

    return NextResponse.json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
      message: 'SMS sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending SMS:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send SMS',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
