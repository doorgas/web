import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SupportChat from '@/components/support/SupportChat';

export default async function SupportPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/register');
  }

  const userId = session.user.id as string;
  const userType = (session.user as any)?.userType as string | undefined;

  return <SupportChat userId={userId} userType={userType} />;
}