'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

// Agora RTM types (simplified)
interface AgoraRTMClient {
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  createChannel: (channelName: string) => AgoraRTMChannel;
}

interface AgoraRTMChannel {
  join: () => Promise<void>;
  leave: () => Promise<void>;
  sendMessage: (message: { text: string }) => Promise<void>;
  on: (event: string, callback: (message: any, memberId: string) => void) => void;
}

interface ChatContextType {
  rtmClient: AgoraRTMClient | null;
  currentChannel: AgoraRTMChannel | null;
  isConnected: boolean;
  joinChannel: (channelName: string) => Promise<void>;
  leaveChannel: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  onMessageReceived: (callback: (message: string, senderId: string) => void) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const [rtmClient, setRtmClient] = useState<AgoraRTMClient | null>(null);
  const [currentChannel, setCurrentChannel] = useState<AgoraRTMChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageCallback, setMessageCallback] = useState<((message: string, senderId: string) => void) | null>(null);

  // Initialize Agora RTM client
  useEffect(() => {
    if (!session?.user?.id) return;

    const initializeRTM = async () => {
      try {
        // For now, we'll skip the actual Agora RTM initialization
        // and just mark as connected for basic chat functionality
        console.log('Chat system initialized for user:', session.user.id);
        setIsConnected(true);
        
        // TODO: Implement proper Agora RTM initialization
        // const AgoraRTM = await import('agora-rtm-sdk');
        // const client = AgoraRTM.default.createInstance('2706ac010ad0447f969b7998cfec25b4');
        // setRtmClient(client);
      } catch (error) {
        console.error('Failed to initialize chat system:', error);
      }
    };

    initializeRTM();

    return () => {
      if (rtmClient) {
        rtmClient.logout().catch(console.error);
      }
    };
  }, [session?.user?.id]);

  const joinChannel = async (channelName: string) => {
    // For now, just log the channel join
    console.log('Joining channel:', channelName);
    // TODO: Implement actual Agora RTM channel join
  };

  const leaveChannel = async () => {
    // For now, just log the channel leave
    console.log('Leaving channel');
    // TODO: Implement actual Agora RTM channel leave
  };

  const sendMessage = async (message: string) => {
    // For now, just log the message
    console.log('Sending message:', message);
    // TODO: Implement actual Agora RTM message sending
    // The actual message sending will be handled by the API for persistence
  };

  const onMessageReceived = useCallback((callback: (message: string, senderId: string) => void) => {
    setMessageCallback(() => callback);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        rtmClient,
        currentChannel,
        isConnected,
        joinChannel,
        leaveChannel,
        sendMessage,
        onMessageReceived,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};