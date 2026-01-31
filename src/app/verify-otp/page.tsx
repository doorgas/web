'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function VerifyOTPContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const verifyOTP = async () => {
      const email = searchParams.get('email');
      const token = searchParams.get('token');

      if (!email || !token) {
        router.push('/register');
        return;
      }

      try {
        const query = new URLSearchParams({ email, token }).toString();
        const response = await fetch(`/api/auth/verify-otp?${query}`);


        //const response = await fetch(`/api/auth/verify-otp?email=${email}&token=${token}`);
        const data = await response.json();

        if (data.success) {
          console.log('Redirecting to:', data.redirectUrl);
          // Sign in the user
          await signIn('credentials', {
            email,
            redirect: true,
            callbackUrl: data?.redirectUrl || '/dashboard', // ✅ fallback added
          });
        } else {
          router.push('/register?error=' + encodeURIComponent(data.error));
        }
      } catch (error) {
        router.push('/register?error=Verification failed');
      }
    };

    verifyOTP();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Verifying your email...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Loading...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
} 