'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User } from 'lucide-react';

interface LastMessage {
  id: string;
  message: string;
  senderId: string | null;
  senderKind: string;
  createdAt: string;
  senderName: string;
}

interface Conversation {
  id: string;
  customerId: string;
  driverId: string | null;
  orderId: string | null;
  agoraChannelName: string;
  isActive: boolean;
  lastMessageAt: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  driverName: string;
  driverEmail: string;
  lastMessage: LastMessage | null;
  unreadCount: number;
  orderNumber?: string;
}

interface ChatListProps {
  userId: string;
}

const ChatList: React.FC<ChatListProps> = ({ userId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
    
    // Set up polling for real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchConversations(false); // Don't show loading on polling
    }, 5000);

    // DISABLED: Listen for page visibility changes to refresh when user returns
    // const handleVisibilityChange = () => {
    //   if (!document.hidden) {
    //     // Page became visible, refresh conversations
    //     fetchConversations(false);
    //   }
    // };

    // DISABLED: Listen for window focus to refresh when user returns to the page
    // const handleWindowFocus = () => {
    //   fetchConversations(false);
    // };

    // Listen for storage changes (when messages are marked as read)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('chat_read_')) {
        // A conversation was marked as read, refresh the list
        fetchConversations(false);
      }
    };

    // document.addEventListener('visibilitychange', handleVisibilityChange);
    // window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      // document.removeEventListener('visibilitychange', handleVisibilityChange);
      // window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchConversations = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await fetch('/api/chat/conversations');
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        throw new Error(`Failed to fetch conversations: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherUserInfo = (conversation: Conversation) => {
    const isCustomer = conversation.customerId === userId;
    // Check if this is a support conversation (null driverId)
    const isSupportChat = conversation.driverId === null;
    return {
      name: isCustomer 
        ? (isSupportChat ? 'Support Team' : conversation.driverName) 
        : conversation.customerName,
      email: isCustomer ? conversation.driverEmail : conversation.customerEmail,
      role: isCustomer 
        ? (isSupportChat ? 'Support Chat' : 'Driver') 
        : 'Customer',
    };
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="p-6 text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => fetchConversations()}
            className="mt-3 text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <Card className="p-6 text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
          <p className="text-gray-600">
            Start a conversation with a driver from your orders page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="space-y-3">
        {conversations.map((conversation) => {
          const otherUser = getOtherUserInfo(conversation);
          
          return (
            <Link
              key={conversation.id}
              href={`/chat/${conversation.id}`}
              className="block"
            >
              <Card className={`p-4 hover:bg-gray-50 transition-colors ${
                conversation.unreadCount > 0 ? 'bg-blue-50 border-blue-200' : ''
              }`}>
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    conversation.unreadCount > 0 ? 'bg-blue-200' : 'bg-blue-100'
                  }`}>
                    <User className={`w-5 h-5 ${
                      conversation.unreadCount > 0 ? 'text-blue-700' : 'text-blue-600'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <h3 className={`text-sm truncate ${
                          conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
                        }`}>
                          {otherUser.name || 'Unknown User'}
                        </h3>
                        {conversation.orderNumber && (
                          <span className="text-xs font-semibold text-blue-600">
                            Order #{conversation.orderNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {otherUser.role}
                        </Badge>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-blue-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Last message */}
                    {conversation.lastMessage ? (
                      <p className={`text-sm truncate ${
                        conversation.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                      }`}>
                        {conversation.lastMessage.senderId === userId ? 'You: ' : ''}
                        {conversation.lastMessage.message}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No messages yet</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;