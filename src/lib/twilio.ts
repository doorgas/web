const twilio = require('twilio');

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Generate access token for Twilio Conversations
export function generateConversationToken(identity: string, serviceSid?: string) {
  const AccessToken = twilio.jwt.AccessToken;
  const ConversationGrant = AccessToken.ConversationGrant;

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { identity }
  );

  // Add conversation grant
  const conversationGrant = new ConversationGrant({
    serviceSid: serviceSid || process.env.TWILIO_CONVERSATIONS_SERVICE_SID,
  });

  token.addGrant(conversationGrant);

  return token.toJwt();
}

// Generate access token for Twilio Voice
export function generateVoiceToken(identity: string) {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { identity }
  );

  // Add voice grant
  const voiceGrant = new VoiceGrant({
    incomingAllow: true,
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
  });

  token.addGrant(voiceGrant);

  return token.toJwt();
}

// Create or get a conversation
export async function createOrGetConversation(conversationSid: string, friendlyName: string) {
  try {
    // Try to fetch existing conversation
    const conversation = await twilioClient.conversations.v1
      .services(process.env.TWILIO_CONVERSATIONS_SERVICE_SID!)
      .conversations(conversationSid)
      .fetch();
    
    return conversation;
  } catch (error: any) {
    if (error.code === 20404) {
      // Conversation doesn't exist, create it
      const conversation = await twilioClient.conversations.v1
        .services(process.env.TWILIO_CONVERSATIONS_SERVICE_SID!)
        .conversations
        .create({
          uniqueName: conversationSid,
          friendlyName: friendlyName,
        });
      
      return conversation;
    }
    throw error;
  }
}

// Add participant to conversation
export async function addParticipantToConversation(conversationSid: string, identity: string) {
  try {
    const participant = await twilioClient.conversations.v1
      .services(process.env.TWILIO_CONVERSATIONS_SERVICE_SID!)
      .conversations(conversationSid)
      .participants
      .create({
        identity: identity,
      });
    
    return participant;
  } catch (error: any) {
    // If participant already exists, that's fine
    if (error.code === 50433) {
      return null;
    }
    throw error;
  }
}

// Make a voice call between two participants
export async function initiateVoiceCall(fromIdentity: string, toIdentity: string) {
  try {
    const call = await twilioClient.calls.create({
      to: `client:${toIdentity}`,
      from: `client:${fromIdentity}`,
      applicationSid: process.env.TWILIO_TWIML_APP_SID,
    });
    
    return call;
  } catch (error) {
    console.error('Error initiating voice call:', error);
    throw error;
  }
}

export { twilioClient };