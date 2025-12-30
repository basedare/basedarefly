/**
 * API Request/Response Types
 */

export type DareStatus = "pending" | "accepted" | "completed" | "failed" | "verified";
export type DareCategory = "gaming" | "irl" | "creative" | "fitness" | "food" | "other";
export type DareDifficulty = "easy" | "medium" | "hard" | "extreme";

export interface Dare {
  id: string;
  title: string;
  description: string;
  stake_amount: number;
  expiry_timer: string; // ISO 8601 Date String
  status: DareStatus;
  proof_video_url?: string;
  category?: DareCategory;
  difficulty?: DareDifficulty;
  streamer_name?: string;
  streamer_address?: string;
  image_url?: string;
  created_by?: string;
  created_date?: string;
  onchain_tx_hash?: string;
  onchain_dare_id?: string;
  acceptor_id?: string;
}

export interface CreateDareRequest {
  title: string;
  description: string;
  stake_amount?: number;
  expiry_timer?: string;
  streamer_name?: string;
  streamer_address?: string;
  category?: DareCategory;
  difficulty?: DareDifficulty;
  image_url?: string;
  created_by?: string;
}

export interface CreateOnchainDareRequest {
  streamerAddress: string;
  amount: number; // USDC amount in human-readable format
  referrerAddress?: string;
  base44Data?: Partial<Dare>; // Optional data to sync to Base44
}

export interface UpdateDareRequest {
  status?: DareStatus;
  proof_video_url?: string;
  [key: string]: any; // Allow other fields
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface VerifyProofRequest {
  dareId: string | number;
}

export interface UploadFileResponse {
  file_url: string;
  file_id?: string;
}



