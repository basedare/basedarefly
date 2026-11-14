import { creatorRoutingPaused } from '@/lib/buyer-workspace-auth';

// Legacy slot routing is parked. Keep canonical linked-Dare proof/review intact.
export async function POST() { return creatorRoutingPaused(); }
