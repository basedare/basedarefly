import { createClient } from '@base44/sdk';

// Server-side Base44 client configuration
// This will be used in API routes
export const base44 = createClient({
  appId: process.env.NEXT_PUBLIC_BASE44_APP_ID || "68fdae09d2124933d726e89a",
  requiresAuth: false, // Server-side can work without auth for some operations
  // API key can be added via serviceToken if needed
  ...(process.env.BASE44_API_KEY && { serviceToken: process.env.BASE44_API_KEY }),
});

// Export entities for easy access (typed as any for now since SDK types may not be fully available)
export const Dare = (base44 as any).entities?.Dare;
export const User = (base44 as any).auth;



