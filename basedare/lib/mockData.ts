import { Dare } from "@/types";

export const MOCK_DARES: Dare[] = [
  { 
    id: "1", 
    title: "Eat a Ghost Pepper", 
    description: "No milk allowed for 5 minutes. Full cam on face.",
    stake_amount: 100, 
    status: "accepted", 
    streamer_name: "KaiCenat", 
    category: "food",
    difficulty: "extreme",
    image_url: "/bear-mascot.png", 
    expiry_timer: new Date(Date.now() + 86400000).toISOString(),
    created_date: new Date().toISOString()
  },
  { 
    id: "2", 
    title: "Shave Eyebrows", 
    description: "Clean shave. No makeup to hide it.",
    stake_amount: 500, 
    status: "completed", 
    streamer_name: "IShowSpeed", 
    category: "irl",
    difficulty: "hard",
    image_url: "/bear-mascot.png", 
    expiry_timer: new Date(Date.now() - 100000).toISOString(), // Expired
    proof_video_url: "https://example.com/video.mp4" 
  },
  { 
    id: "3", 
    title: "Call Your Ex", 
    description: "Must be on speaker. No muting.",
    stake_amount: 50, 
    status: "pending", 
    streamer_name: "Pokimane", 
    category: "gaming", // Categorized as gaming/social
    difficulty: "medium",
    image_url: "/bear-mascot.png", 
    expiry_timer: new Date(Date.now() + 100000).toISOString() 
  },
  { 
    id: "4", 
    title: "Win Warzone with Pistol Only", 
    description: "No loadouts, ground loot pistol only.",
    stake_amount: 200, 
    status: "failed", 
    streamer_name: "DrDisrespect", 
    category: "gaming",
    difficulty: "extreme",
    image_url: "/bear-mascot.png", 
    expiry_timer: new Date(Date.now() - 500000).toISOString() 
  },
];

export const MOCK_LEADERBOARD = [
  { rank: 1, name: "MrBeast", score: 150000 },
  { rank: 2, name: "BaseGod", score: 98000 },
  { rank: 3, name: "PeeBear", score: 69420 },
];
