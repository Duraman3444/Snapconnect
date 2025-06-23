export interface Story {
  id: string;
  userId: string;
  mediaURL: string;
  mediaType: 'image' | 'video';
  duration?: number; // For video stories
  caption?: string;
  createdAt: Date;
  expiresAt: Date; // 24 hours from creation
  viewers: StoryViewer[];
  isHighlighted: boolean;
  highlightId?: string;
  backgroundColor?: string;
  textOverlay?: StoryTextOverlay;
  music?: StoryMusic;
  location?: StoryLocation;
  tags: string[]; // For RAG content analysis
}

export interface StoryViewer {
  userId: string;
  viewedAt: Date;
  viewDuration?: number; // How long they viewed it
}

export interface StoryTextOverlay {
  text: string;
  position: {
    x: number;
    y: number;
  };
  size: 'small' | 'medium' | 'large';
  color: string;
  backgroundColor?: string;
  font: string;
}

export interface StoryMusic {
  title: string;
  artist: string;
  snippet: string; // URL to audio snippet
  startTime: number; // Start time in seconds
  duration: number; // Duration in seconds
}

export interface StoryLocation {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface StoryHighlight {
  id: string;
  userId: string;
  title: string;
  coverImageURL: string;
  stories: string[]; // Array of story IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryInsights {
  storyId: string;
  totalViews: number;
  uniqueViews: number;
  averageViewDuration: number;
  screenshots: number;
  shares: number;
  impressions: number;
}

export interface StoryTemplate {
  id: string;
  name: string;
  category: string;
  previewURL: string;
  backgroundColor: string;
  textOverlays: StoryTextOverlay[];
  music?: StoryMusic;
  isRAGGenerated: boolean; // For AI-generated templates
} 