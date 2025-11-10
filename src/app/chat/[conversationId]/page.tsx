import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChatRoom from '@/components/chat/ChatRoom';

interface ChatPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/register');
  }

  const { conversationId } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <ChatRoom 
          conversationId={conversationId} 
          userId={session.user.id}
        />
      </div>
    </div>
  );
}