export type DareStatus = "pending" | "accepted" | "completed" | "failed";

export type DareCategory = "gaming" | "irl" | "creative" | "fitness" | "food" | "other";

export type DareDifficulty = "easy" | "medium" | "hard" | "extreme";

export interface Dare {
  id: string; // Added for React keys
  title: string;
  description: string;
  stake_amount: number;
  expiry_timer: string; // ISO 8601 Date String
  status: DareStatus;
  
  // Optional fields based on your schema
  proof_video_url?: string;
  category?: DareCategory;
  difficulty?: DareDifficulty;
  streamer_name?: string;
  image_url?: string;
  
  // Additional fields inferred from your app logic
  created_by?: string;
  created_date?: string;
}


