import { createClient } from '@base44/sdk';

// Server-side Base44 client configuration
// This will be used in API routes
export const base44 = createClient({
  appId: process.env.NEXT_PUBLIC_BASE44_APP_ID || "68fdae09d2124933d726e89a",
  requiresAuth: false, // Server-side can work without auth for some operations
  // Add API key if needed for server-side operations
  apiKey: process.env.BASE44_API_KEY,
});

// Export entities for easy access
export const Dare = base44.entities.Dare;
export const User = base44.auth;



