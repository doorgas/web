// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { verification_tokens } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: Request) {
  const { email, password, name, note } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email or phone number and password are required.' }, { status: 400 });
  }

  // Detect if input is email or phone
  const isEmail = email.includes('@');
  
  // Look up the OTP entry  
  const tokenRow = await db.select().from(verification_tokens).where(eq(email, verification_tokens.identifier)).limit(1);
  if (!tokenRow.length) {
    return NextResponse.json({ error: "OTP not found" }, { status: 400 });
  }
  const { otp: hashedOtp, expires } = tokenRow[0];
  //if (new Date() > new Date(expiresAt)) {
  //  return NextResponse.json({ error: "OTP expired" }, { status: 400 });
  //}
  const valid = await bcrypt.compare(password, hashedOtp);
  if (!valid) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }
  // OTP valid: clean up and sign in user
  await db.delete(verification_tokens).where(eq(email, verification_tokens.identifier));

  // Check if user already exists (check both email and phone fields)
  let existingUser;
  if (isEmail) {
    [existingUser] = await db.select().from(user).where(eq(user.email, email));
  } else {
    [existingUser] = await db.select().from(user).where(eq(user.phone, email));
  }
  if (existingUser) {
    // Check user status
    if (existingUser.status === 'pending') {
      return NextResponse.json({ 
        success: false, 
        message: 'Your account is pending approval. Please wait for admin approval before logging in.',
        requiresApproval: true 
      }, { status: 403 });
    } else if (existingUser.status === 'suspended') {
      return NextResponse.json({ 
        success: false, 
        message: 'Your account has been suspended. Please contact support.',
        suspended: true 
      }, { status: 403 });
    } else if (existingUser.status === 'approved') {
      return NextResponse.json({ success: true, message: 'User logged in successfully.' });
    }
  } else {

  // Insert new user with pending status
  const userData: any = {
    id: uuidv4(),
    name: name || null,
    note: note || null,
    status: 'pending',
  };

  // Set email or phone based on input type
  if (isEmail) {
    userData.email = email;
    // Send welcome email only if it's an email registration
    await sendWelcomeEmail(email, name || undefined);
  } else {
    userData.phone = email;
    // For phone registration, we need to provide a placeholder email or make it nullable
    userData.email = `${email.replace(/[^0-9]/g, '')}@phone.placeholder`; // Placeholder email
  }

  await db.insert(user).values(userData);

  return NextResponse.json({ 
    success: true, 
    message: 'Account created successfully! Your account is pending approval. You will be able to login once an admin approves your account.',
    requiresApproval: true 
  });
  }
}
