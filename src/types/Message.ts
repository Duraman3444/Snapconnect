export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  type: MessageType;
  content?: string;
  mediaURL?: string;
  mediaType?: 'image' | 'video' | 'audio';
  duration?: number; // For video/audio messages
  createdAt: Date;
  expiresAt?: Date; // For disappearing messages
  viewedAt?: Date;
  isRead: boolean;
  reactions: MessageReaction[];
  replyTo?: string; // Message ID for replies
  editedAt?: Date;
  isDeleted: boolean;
}

export interface GroupMessage extends Omit<Message, 'recipientId'> {
  groupId: string;
  readBy: string[]; // Array of user IDs who have read the message
}

export type MessageType = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'location'
  | 'contact'
  | 'snap'; // Special type for disappearing photos/videos

export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: string[]; // Array of user IDs
  type: 'direct' | 'group';
  name?: string; // For group chats
  groupPhotoURL?: string;
  lastMessage?: Message;
  lastActivity: Date;
  createdAt: Date;
  isArchived: boolean;
  mutedBy: string[]; // Users who muted this conversation
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
} 