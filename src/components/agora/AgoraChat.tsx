'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import AgoraRTM, { RTMClient } from 'agora-rtm-sdk';
import { Send, Paperclip, Phone, Video, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { agoraConfig, AgoraMessage, ChatUser } from '@/lib/agora';

interface AgoraChatProps {
  orderId: string;
  orderNumber: string;
  isDriver: boolean;
}

export function AgoraChat({ orderId, orderNumber, isDriver }: AgoraChatProps) {
  const { data: session } = useSession();
  const [client, setClient] = useState<RTMClient | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [messages, setMessages] = useState<AgoraMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelName = `order_${orderId}`;
  const currentUserId = session?.user?.id || '';
  const currentUserName = session?.user?.name || (isDriver ? 'Driver' : 'Customer');

  useEffect(() => {
    if (currentUserId && agoraConfig.appId) {
      initializeAgora();
    }
    
    return () => {
      // cleanup(); // TODO: Re-enable when Agora is working
    };
  }, [currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeAgora = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Update to use latest Agora SDK API
      console.warn('Agora RTM client initialization disabled - needs API update');
      // Agora functionality disabled for now
      
      // Dummy client to avoid compilation errors
      const rtmClient: any = null;
      
      if (rtmClient) {
        // Set up event listeners
        rtmClient.on('MessageFromPeer', (message: any, peerId: string) => {
        handlePeerMessage(message, peerId);
      });

      rtmClient.on('ConnectionStateChanged', (newState: string, reason: string) => {
        console.log('RTM connection state changed:', newState, reason);
        setIsConnected(newState === 'CONNECTED');
      });

      // Login to RTM
      await rtmClient.login({ uid: currentUserId });
      console.log('RTM login successful');
      
      // Create or join channel
      const rtmChannel = rtmClient.createChannel(channelName);
      
      rtmChannel.on('ChannelMessage', (message: any, memberId: string) => {
        handleChannelMessage(message, memberId);
      });

      rtmChannel.on('MemberJoined', (memberId: string) => {
        console.log('Member joined:', memberId);
        updateOtherUserStatus(memberId, true);
      });

      rtmChannel.on('MemberLeft', (memberId: string) => {
        console.log('Member left:', memberId);
        updateOtherUserStatus(memberId, false);
      });

      await rtmChannel.join();
      console.log('Joined channel:', channelName);

      setClient(rtmClient);
      setChannel(rtmChannel);
      setIsConnected(true);
      
      // Get channel members
      const members = await rtmChannel.getMembers();
      console.log('Channel members:', members);
      
      // Find the other user
      const otherUserId = members.find((id: string) => id !== currentUserId);
      if (otherUserId) {
        setOtherUser({
          id: otherUserId,
          name: isDriver ? 'Customer' : 'Driver',
          isOnline: true
        });
      }
      
      } // end if (rtmClient)

    } catch (error) {
      console.error('Failed to initialize Agora:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeerMessage = (message: any, peerId: string) => {
    const messageData: AgoraMessage = {
      id: Date.now().toString(),
      text: message.text,
      senderId: peerId,
      senderName: isDriver ? 'Customer' : 'Driver',
      timestamp: Date.now(),
      messageType: 'text'
    };
    
    setMessages(prev => [...prev, messageData]);
  };

  const handleChannelMessage = (message: any, memberId: string) => {
    if (memberId === currentUserId) return; // Don't show our own messages twice
    
    const messageData: AgoraMessage = {
      id: Date.now().toString(),
      text: message.text,
      senderId: memberId,
      senderName: isDriver ? 'Customer' : 'Driver',
      timestamp: Date.now(),
      messageType: 'text'
    };
    
    setMessages(prev => [...prev, messageData]);
  };

  const updateOtherUserStatus = (memberId: string, isOnline: boolean) => {
    if (memberId !== currentUserId) {
      setOtherUser(prev => prev ? { ...prev, isOnline } : {
        id: memberId,
        name: isDriver ? 'Customer' : 'Driver',
        isOnline
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channel || !isConnected) return;

    try {
      // Send to channel
      await channel.sendMessage({ text: newMessage.trim() });
      
      // Add to local messages
      const messageData: AgoraMessage = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        senderId: currentUserId,
        senderName: currentUserName,
        timestamp: Date.now(),
        messageType: 'text'
      };
      
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const cleanup = async () => {
    try {
      if (channel) {
        await channel.leave();
      }
      if (client) {
        await client.logout();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  if (!agoraConfig.appId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Chat service not configured</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please configure NEXT_PUBLIC_AGORA_APP_ID
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {otherUser?.name?.charAt(0) || (isDriver ? 'C' : 'D')}
              </AvatarFallback>
            </Avatar>
            {otherUser?.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {otherUser?.name || (isDriver ? 'Customer' : 'Driver')}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Order #{orderNumber}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {isConnected ? (otherUser?.isOnline ? 'Online' : 'Offline') : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" disabled>
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-background">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Start a conversation about Order #{orderNumber}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === currentUserId;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwn && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {message.senderName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted text-foreground rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card rounded-b-lg">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${isDriver ? 'customer' : 'driver'}...`}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={!isConnected}
            />
          </div>
          <Button 
            onClick={sendMessage} 
            size="sm"
            disabled={!newMessage.trim() || !isConnected}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <p className="text-xs text-muted-foreground mt-2">
            Reconnecting to chat...
          </p>
        )}
      </div>
    </div>
  );
}