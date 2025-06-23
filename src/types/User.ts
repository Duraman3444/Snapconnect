export interface User {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  interests: string[]; // For RAG personalization later
  friends: string[]; // Array of friend UIDs
  blockedUsers: string[]; // Array of blocked user UIDs
  settings: UserSettings;
  createdAt: Date;
  lastSeen: Date;
  isOnline: boolean;
}

export interface UserSettings {
  privacy: {
    storyVisibility: 'everyone' | 'friends' | 'close-friends';
    messageVisibility: 'everyone' | 'friends';
    locationSharing: boolean;
  };
  notifications: {
    messages: boolean;
    stories: boolean;
    friendRequests: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  friendCount: number;
  mutualFriends: string[];
  isFriend: boolean;
  isBlocked: boolean;
  friendRequestStatus?: 'sent' | 'received' | 'none';
}

export interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
} 