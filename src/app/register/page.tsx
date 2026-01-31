'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ThemedButton } from '@/components/ui/themed-button';
import { Toaster } from '@/components/ui/toaster';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Mail, ArrowLeft, User, FileText } from 'lucide-react';
import { DynamicTitle } from '@/components/DynamicTitle';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Skeleton } from '@/components/ui/skeleton';

// Component that uses searchParams - needs to be in Suspense
function RegisterContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('register');

  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState('');
  const [accountPending, setAccountPending] = useState(false);
  const [magicToken, setMagicToken] = useState<string | null>(null);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading } = useTheme();

  useEffect(() => {
    const magic = searchParams.get('magic');
    if (magic) {
      setMagicToken(magic);
      setIsMagicLink(true);
      // Show a message about magic link usage
      setSuccess('🎉 You\'re joining via a special invitation link! Your account will be automatically approved.');
    }
  }, [searchParams]);

  // Helper function to detect if input is email or phone number
  const detectInputType = (input: string): 'email' | 'phone' => {
    // Remove all spaces and special characters except @ and +
    const cleanInput = input.trim();
    
    // Check if it contains @ symbol (email)
    if (cleanInput.includes('@')) {
      return 'email';
    }
    
    // Check if it starts with + or contains only digits (phone)
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (phoneRegex.test(cleanInput)) {
      return 'phone';
    }
    
    // Default to email if uncertain
    return 'email';
  };

  // Helper function to format phone number to E.164 format
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, assume it's a US number and add +1
    if (!cleaned.startsWith('+')) {
      cleaned = '+1' + cleaned;
    }
    
    return cleaned;
  };





  const verifyOtp = async () => {
    setVerifying(true);
    setOtpError('');
    
    if (!password) {
      setOtpError('Verification code is required');
      setVerifying(false);
      return;
    }

    try {
      // Both login and register use the same endpoint since they both verify OTP
      const res = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          name, 
          note, 
          password,
          magicToken: magicToken 
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle specific error cases for pending/suspended accounts
        if (data.requiresApproval) {
          setOtpError(data.message || 'Your account is pending approval. Please wait for admin approval.');
          return;
        }
        if (data.suspended) {
          setOtpError(data.message || 'Your account has been suspended. Please contact support.');
          return;
        }
        setOtpError(data.error || 'Invalid verification code');
      } else {
        // Check if account requires approval
        if (data.requiresApproval) {
          setSuccess(data.message || 'Account created successfully! Your account is pending approval.');
          setAccountPending(true);
          // Don't attempt to login, just show success message
          return;
        }
        
        // Handle auto-approved accounts (magic link users)
        if (data.autoApproved) {
          setSuccess(data.message || 'Account created and automatically approved!');
          // Auto-login after verification for auto-approved accounts
          const login = await signIn('credentials', {
            email,
            redirect: false,
          });

          if (login?.ok) {
            router.push('/dashboard');
          } else {
            setOtpError('Account approved but login failed.');
          }
          return;
        }
        
        // Auto-login after verification for approved accounts
        const login = await signIn('credentials', {
          email,
          redirect: false,
        });

        if (login?.ok) {
          router.push('/dashboard');
        } else {
          setOtpError('Verified but login failed.');
        }
      }
    } catch (error) {
      setOtpError('An error occurred. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSuccess('');
    setEmailError('');

    if (!email) {
      setEmailError('Email or phone number is required');
      setSending(false);
      return;
    }

    const inputType = detectInputType(email);
    
    try {
      if (inputType === 'email') {
        // Send OTP via email
        const res = await fetch('/api/email/send', {
          method: 'POST',
          body: JSON.stringify({
            to: email,
            subject: 'Your Verification Code',
            message: 'Your verification code has been sent.',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess('Verification code sent to your email successfully!');
          setStep('otp');
        } else {
          setEmailError(data.error || 'Failed to send email.');
        }
      } else {
        // Send OTP via SMS
        const formattedPhone = formatPhoneNumber(email);
        const res = await fetch('/api/twilio/send-sms', {
          method: 'POST',
          body: JSON.stringify({
            to: formattedPhone,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess('Verification code sent to your phone successfully!');
          setStep('otp');
        } else {
          setEmailError(data.error || 'Failed to send SMS.');
        }
      }
    } catch (error) {
      setEmailError('An error occurred while sending verification code.');
    } finally {
      setSending(false);
    }
  };

  const resendOtp = async () => {
    setSending(true);
    setSuccess('');
    setOtpError('');

    const inputType = detectInputType(email);
    
    try {
      if (inputType === 'email') {
        // Resend OTP via email
        const res = await fetch('/api/email/send', {
          method: 'POST',
          body: JSON.stringify({
            to: email,
            subject: 'Your Verification Code',
            message: 'Your verification code has been sent.',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess('Verification code resent to your email successfully!');
        } else {
          setOtpError(data.error || 'Failed to resend email.');
        }
      } else {
        // Resend OTP via SMS
        const formattedPhone = formatPhoneNumber(email);
        const res = await fetch('/api/twilio/send-sms', {
          method: 'POST',
          body: JSON.stringify({
            to: formattedPhone,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess('Verification code resent to your phone successfully!');
        } else {
          setOtpError(data.error || 'Failed to resend SMS.');
        }
      }
    } catch (error) {
      setOtpError('An error occurred while resending verification code.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
      <DynamicTitle pageTitle="Register" />
      <Header title="Store name" showSearch notifications={2} />
      
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isLoading ? (
            <div className="mx-auto w-16 h-16 mb-4">
              <Skeleton className="w-16 h-16 rounded-full" />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
          )}
          <CardTitle className="text-2xl">
            {accountPending 
              ? 'Account Created!' 
              : step === 'email' 
                ? (activeTab === 'login' ? 'Welcome Back' : (isMagicLink ? '🎉 Special Invitation' : 'Create Account'))
                : 'Verify Your Email'
            }
          </CardTitle>
          <CardDescription>
            {accountPending 
              ? 'Your account has been created successfully and is pending approval.'
              : step === 'email' 
                ? (activeTab === 'login' 
                    ? 'Enter your email or phone number to sign in to your account'
                    : (isMagicLink 
                        ? 'You\'re joining with a special invitation link! Your account will be automatically approved upon registration.'
                        : 'Fill in your details to create a new account'
                      )
                  )
                : `We've sent a verification code to ${email}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {accountPending ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-green-600 font-medium">{success}</p>
                <p className="text-sm text-muted-foreground">
                  You will receive an email notification once your account is approved by an admin.
                </p>
              </div>
            </div>
          ) : step === 'email' && (
            <>
              {isMagicLink && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      🎉
                    </div>
                    <div className="text-sm text-green-800">
                      <strong>Special Invitation Active!</strong> Your account will be automatically approved.
                    </div>
                  </div>
                </div>
              )}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                <form className="space-y-4" onSubmit={sendCode}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address Or Phone Number</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Email or Phone Number" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        id="email"
                        type="text"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <ThemedButton type="submit" className="w-full" disabled={sending}>
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Code'
                    )}
                  </ThemedButton>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-4">
                <form className="space-y-4" onSubmit={sendCode}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="User Name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        id="name"
                        type="text"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address Or Phone Number</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Email or Phone Number" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        id="email"
                        type="text"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">Note (Optional)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea 
                        placeholder="Add any additional notes..." 
                        value={note} 
                        onChange={(e) => setNote(e.target.value)}
                        id="note"
                        className="pl-10 min-h-[80px] resize-none"
                      />
                    </div>
                  </div>

                  <ThemedButton type="submit" className="w-full" disabled={sending}>
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Code'
                    )}
                  </ThemedButton>
                </form>
              </TabsContent>

              {success && !accountPending && <p style={{ color: 'green' }}>{success}</p>}
              {emailError && <p style={{ color: 'red' }}>{emailError}</p>}
            </Tabs>
            </>
          )}

          {!accountPending && step === 'otp' && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                size="sm"
                className="mb-4"
                onClick={() => setStep('email')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to email
              </Button>
              
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); verifyOtp(); }}>
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <div className="flex justify-center">
                  <Input type="text" placeholder="Enter OTP" value={password} onChange={(e) => setPassword(e.target.value)} disabled={verifying} />
                  </div>
                </div>
                
                
                <ThemedButton type="submit" className="w-full" disabled={verifying}>
                  {verifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Signing In...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </ThemedButton>
              </form>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?{' '}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto font-normal"
                    onClick={resendOtp}
                    disabled={sending}
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Resending...
                      </>
                    ) : (
                      'Resend'
                    )}
                  </Button>
                </p>
              </div>

              {success && <p style={{ color: 'green' }}>{success}</p>}
              {otpError && <p style={{ color: 'red' }}>{otpError}</p>}
            </div>
          )}
          
        </CardContent>
      </Card>
      </div>

      <Footer />
      <MobileNav />
      <Toaster />
    </div>
    </>
  );
}

// Loading component for Suspense fallback
function RegisterPageLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Store name" showSearch notifications={2} />
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 mb-4">
              <Skeleton className="w-16 h-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
      <MobileNav />
    </div>
  );
}

// Main component with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageLoading />}>
      <RegisterContent />
    </Suspense>
  );
}
