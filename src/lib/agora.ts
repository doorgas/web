export const agoraConfig = {
  appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
  // For production, you should implement a token server
  // For now, we'll use temporary tokens or null for testing
  rtmToken: null,
  rtcToken: null,
};

export interface AgoraMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  messageType: 'text' | 'image' | 'file';
}

export interface ChatUser {
  id: string;
  name: string;
  isOnline: boolean;
}