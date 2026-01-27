/**
 * Auto-moderation for BaseDare
 *
 * Flags sketchy/dangerous dares before they go live.
 * Layers:
 * 1. Blocklist - instant reject for dangerous keywords
 * 2. Flaglist - flag for manual review
 * 3. AI check - optional LLM content classification
 */

// Instant reject - dangerous/illegal content
const BLOCKLIST = [
  // Violence/harm
  /\b(kill|murder|shoot|stab|attack|assault|hurt|harm)\b/i,
  /\b(suicide|self.?harm|cut yourself)\b/i,
  // Illegal
  /\b(illegal|drugs|cocaine|heroin|meth|steal|rob|theft)\b/i,
  /\b(child|minor|underage|kids?)\b.*\b(nude|naked|sexual)\b/i,
  // Dangerous stunts
  /\b(jump off|jump from)\b.*\b(building|bridge|roof)\b/i,
  /\b(drink|consume)\b.*\b(bleach|poison|chemicals?)\b/i,
  /\b(drive|driving)\b.*\b(drunk|blindfolded|eyes closed)\b/i,
];

// Flag for review - potentially risky
const FLAGLIST = [
  // Physical risk
  /\b(fire|burn|flame)\b/i,
  /\b(choke|choking|suffocate)\b/i,
  /\b(fight|punch|slap|hit)\b/i,
  /\b(naked|nude|strip)\b/i,
  /\b(drunk|wasted|alcohol)\b.*\b(drive|car)\b/i,
  // Eating challenges
  /\b(eat|swallow|consume)\b.*\b(tide pod|laundry|detergent)\b/i,
  /\b(ghost pepper|carolina reaper|hottest)\b.*\b(10|ten|\d{2,})\b/i,
  // Extreme
  /\b(extreme|dangerous|risky|deadly)\b/i,
  /\b(taser|stun|shock)\b/i,
  /\b(gun|weapon|knife)\b/i,
];

// Safe categories - boost confidence
const SAFELIST = [
  /\b(dance|sing|song|music)\b/i,
  /\b(game|play|gaming|stream)\b/i,
  /\b(eat|food|pizza|burger|spicy)\b/i,
  /\b(workout|pushup|squat|exercise)\b/i,
  /\b(funny|joke|prank|wholesome)\b/i,
  /\b(charity|donate|donation)\b/i,
];

export interface ModerationResult {
  allowed: boolean;
  flagged: boolean;
  reason: string | null;
  confidence: number; // 0-1, higher = more confident it's safe
  matches: string[];
}

/**
 * Moderate dare content
 */
export function moderateDare(title: string, description?: string): ModerationResult {
  const content = `${title} ${description || ''}`.toLowerCase();
  const matches: string[] = [];

  // Check blocklist - instant reject
  for (const pattern of BLOCKLIST) {
    const match = content.match(pattern);
    if (match) {
      matches.push(match[0]);
      return {
        allowed: false,
        flagged: true,
        reason: `Blocked content detected: "${match[0]}"`,
        confidence: 0,
        matches,
      };
    }
  }

  // Check flaglist - needs review
  let flagged = false;
  for (const pattern of FLAGLIST) {
    const match = content.match(pattern);
    if (match) {
      matches.push(match[0]);
      flagged = true;
    }
  }

  // Check safelist - boost confidence
  let safeMatches = 0;
  for (const pattern of SAFELIST) {
    if (pattern.test(content)) {
      safeMatches++;
    }
  }

  // Calculate confidence (0-1)
  // Start at 0.7, reduce for flags, increase for safe matches
  let confidence = 0.7;
  confidence -= matches.length * 0.15; // Each flag reduces confidence
  confidence += safeMatches * 0.1; // Each safe match increases confidence
  confidence = Math.max(0.1, Math.min(1, confidence)); // Clamp 0.1-1

  return {
    allowed: true,
    flagged,
    reason: flagged ? `Flagged for review: ${matches.join(', ')}` : null,
    confidence,
    matches,
  };
}

/**
 * Quick check if content is allowed (for API validation)
 */
export function isContentAllowed(title: string, description?: string): boolean {
  return moderateDare(title, description).allowed;
}

/**
 * Get moderation status string for display
 */
export function getModerationStatus(result: ModerationResult): string {
  if (!result.allowed) return '🚫 BLOCKED';
  if (result.flagged) return '⚠️ FLAGGED';
  if (result.confidence > 0.8) return '✅ SAFE';
  return '👀 REVIEW';
}
