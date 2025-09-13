import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChatList from '@/components/chat/ChatList';
import { MobileNav } from '@/components/layout/MobileNav';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/register');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        </div>

        {/* Chat List */}
        <ChatList userId={session.user.id} />

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}