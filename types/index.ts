// ── Voice / Audio ────────────────────────────────────────────

export interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
}

export interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

export type VoiceTranscript = {
  role: "user" | "assistant";
  text: string;
};

export type VoiceVideo = {
  id: string;
  url: string;
  title?: string;
  embedUrl?: string;
};

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// ── Video ───────────────────────────────────────────────────

export interface VideoDetails {
  description: string;
  category: string;
  tags: string[];
}

export interface EnrichedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  category?: string | null;
  tags: string[];
  fullDescription: string;
  selectedSection?: { startSeconds: number; reason: string };
  startUrl?: string;
  embedUrl?: string;
}

export type TimelineItem =
  | { type: "message"; id: string }
  | { type: "transcript"; idx: number }
  | { type: "video"; idx: number };
