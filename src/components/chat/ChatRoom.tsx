'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, User } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import VoiceCallControls from '@/components/chat/VoiceCallControls';

interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderKind: string;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  senderName: string;
  senderEmail: string;
}

interface ChatRoomProps {
  conversationId: string;
  userId: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ conversationId, userId }) => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserRole, setOtherUserRole] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [channelName, setChannelName] = useState('');
  const [conversationCustomerId, setConversationCustomerId] = useState<string | null>(null);
  const [conversationDriverId, setConversationDriverId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  
  const { joinChannel, leaveChannel, sendMessage: sendAgoraMessage, onMessageReceived } = useChat();

  const sanitizeIdentityPart = (value: string) => value.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 110);

  const toIdentity = (() => {
    // Support chat (driverId null) → ring shared support identity
    if (conversationDriverId === null) return 'support';
    if (!conversationCustomerId || !conversationDriverId) return '';
    const isCustomer = conversationCustomerId === userId;
    return isCustomer
      ? `driver_${sanitizeIdentityPart(conversationDriverId)}`.slice(0, 121)
      : `user_${sanitizeIdentityPart(conversationCustomerId)}`.slice(0, 121);
  })();

  // Scroll to bottom function
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  };

  useEffect(() => {
    fetchMessages();
    
    return () => {
      leaveChannel();
    };
  }, [conversationId]);

  // Mark messages as read when component mounts or conversation changes
  useEffect(() => {
    if (conversationId) {
      markMessagesAsRead();
    }
  }, [conversationId]);

  // Also mark messages as read when new messages arrive (real-time)
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when loading completes (instant scroll for initial load)
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Use setTimeout to ensure DOM has updated, instant scroll for initial load
      setTimeout(() => {
        scrollToBottom(false); // Instant scroll on initial load
      }, 100);
    }
  }, [loading]);

  // Polling for new messages every 3 seconds
  useEffect(() => {
    if (!conversationId || loading) return;

    const pollForMessages = async () => {
      try {
        // Only fetch messages after the last known message
        const url = lastMessageId 
          ? `/api/chat/messages?conversationId=${conversationId}&afterMessageId=${lastMessageId}&limit=50`
          : `/api/chat/messages?conversationId=${conversationId}&limit=50`;
          
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const newMessages = data.messages || [];
          
          if (newMessages.length > 0) {
            // Filter out messages that already exist to prevent duplicates
            setMessages(prev => {
              const existingIds = new Set(prev.map(msg => msg.id));
              const uniqueNewMessages = newMessages.filter((msg: any) => !existingIds.has(msg.id));
              return [...prev, ...uniqueNewMessages];
            });
            
            // Update last message ID
            const latestMessageId = newMessages[newMessages.length - 1]?.id;
            setLastMessageId(latestMessageId);
          }
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    };

    // Initial poll after component loads
    const initialTimer = setTimeout(pollForMessages, 2000);
    
    // Set up polling interval
    const interval = setInterval(pollForMessages, 3000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [conversationId, loading, lastMessageId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // TODO: Real-time message listener will be implemented when Agora RTM is working
  // For now, messages will only update when the component re-fetches or user sends a message

  const markMessagesAsRead = async () => {
    try {
      await fetch('/api/chat/messages/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
        }),
      });
      
      // Signal that messages have been read for this conversation
      localStorage.setItem(`chat_read_${conversationId}`, Date.now().toString());
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      // Fetch messages
      const messagesResponse = await fetch(
        `/api/chat/messages?conversationId=${conversationId}`
      );
      
      if (!messagesResponse.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messagesData = await messagesResponse.json();
      const fetchedMessages = messagesData.messages || [];
      setMessages(fetchedMessages);
      
      // Set the last message ID for polling
      if (fetchedMessages.length > 0) {
        setLastMessageId(fetchedMessages[fetchedMessages.length - 1].id);
      }

      // Get conversation info to set up Agora channel
      const conversationsResponse = await fetch('/api/chat/conversations');
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        const conversation = conversationsData.conversations?.find(
          (conv: any) => conv.id === conversationId
        );
        
        if (conversation) {
          setChannelName(conversation.agoraChannelName);
          setConversationCustomerId(conversation.customerId ?? null);
          setConversationDriverId(conversation.driverId ?? null);
          const isCustomer = conversation.customerId === userId;
          // Check if this is a support conversation (null driverId)
          const isSupportChat = conversation.driverId === null;
          setOtherUserName(
            isCustomer 
              ? (isSupportChat ? 'Support Team' : conversation.driverName) 
              : conversation.customerName
          );
          setOtherUserRole(
            isCustomer 
              ? (isSupportChat ? 'Support Chat' : 'Driver')
              : 'Customer'
          );
          setOrderNumber(conversation.orderNumber || '');
          
          // Join Agora RTM channel
          await joinChannel(conversation.agoraChannelName);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Send via API (for persistence)
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: newMessage.trim(),
          messageType: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add message to local state
      setMessages(prev => [...prev, data.message]);
      
      // Update last message ID to prevent duplicate polling
      setLastMessageId(data.message.id);
      
      // Send via Agora RTM for real-time delivery
      await sendAgoraMessage(newMessage.trim());
      
      setNewMessage('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
        </div>

        {/* Loading messages */}
        <div className="flex-1 p-4">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-xs">
                    <div className="h-10 bg-gray-300 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {otherUserName || 'Chat'}
            </h1>
            <div className="flex items-center gap-2">
              {otherUserRole && (
                <p className="text-sm text-gray-500">{otherUserRole}</p>
              )}
              {orderNumber && (
                <>
                  {otherUserRole && <span className="text-gray-300">•</span>}
                  <p className="text-sm font-semibold text-blue-600">Order #{orderNumber}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <VoiceCallControls
            conversationId={conversationId}
            toIdentity={toIdentity}
            toLabel={otherUserName || 'Support'}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === userId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === userId
                    ? 'bg-blue-600 text-white'
                    : message.senderKind === 'support_bot'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.senderId === userId
                      ? 'text-blue-100'
                      : message.senderKind === 'support_bot'
                      ? 'text-green-100'
                      : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;