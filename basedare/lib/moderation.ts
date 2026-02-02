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
  /\b(kill|murder|shoot|stab|attack|assault|hurt|harm|beat|punch)\b/i,
  /\b(suicide|self.?harm|cut yourself|hang yourself)\b/i,
  /\b(blood|bleed|gore|torture|abuse)\b/i,
  // Illegal
  /\b(illegal|drugs|cocaine|heroin|meth|crack|steal|rob|theft|shoplift)\b/i,
  /\b(child|minor|underage|kids?|teen)\b.*\b(nude|naked|sexual|porn)\b/i,
  /\b(marijuana|weed|420|cannabis)\b.*\b(smoke|buy|sell)\b/i,
  // Dangerous stunts
  /\b(jump off|jump from|fall from)\b.*\b(building|bridge|roof|cliff)\b/i,
  /\b(drink|consume|eat)\b.*\b(bleach|poison|chemicals?|tide.?pod|detergent)\b/i,
  /\b(drive|driving|car)\b.*\b(drunk|blindfolded|eyes closed|wasted)\b/i,
  // Indecent/Sexual - PH compliance (RA 9995, RA 9775)
  /\b(sex|sexual|intercourse|f[u*]ck|screw|bang|shag)\b/i,
  /\b(blowjob|handjob|footjob|rimjob|69|oral)\b/i,
  /\b(masturbat|jerk.?off|cum|orgasm|climax)\b/i,
  /\b(porn|porno|xxx|hentai|onlyfans|nsfw|18\+)\b/i,
  /\b(prostitut|escort|hooker|whore|slut|pimp)\b/i,
  /\b(genital|penis|vagina|dick|cock|pussy|cunt|tits|boobs|nipple)\b/i,
  /\b(flash|expose|show|reveal)\b.*\b(private|privates|genitals|breast|ass|butt)\b/i,
  /\b(public|street)\b.*\b(sex|nude|naked|indecen)\b/i,
  /\b(rape|molest|grope|harass)\b/i,
  // Harassment
  /\b(doxx|dox|swat|bomb|threat)\b/i,
  /\b(racial|racist|hate)\b.*\b(slur|speech)\b/i,
];

// Flag for review - potentially risky
const FLAGLIST = [
  // Physical risk
  /\b(fire|burn|flame|hot|heated)\b/i,
  /\b(choke|choking|suffocate|strangle)\b/i,
  /\b(fight|punch|slap|hit|smack)\b/i,
  /\b(naked|nude|strip|bare)\b/i,
  /\b(drunk|wasted|alcohol|intoxicated)\b/i,
  // Eating challenges
  /\b(eat|swallow|consume)\b.*\b(spicy|pepper|sauce)\b/i,
  /\b(ghost pepper|carolina reaper|hottest|scorpion)\b/i,
  // Extreme
  /\b(extreme|dangerous|risky|deadly|hazardous)\b/i,
  /\b(taser|stun|shock|electr)\b/i,
  /\b(gun|weapon|knife|blade)\b/i,
  /\b(hospital|emergency|911|ambulance)\b/i,
  // Suggestive/Indecent - flag for review
  /\b(sexy|seductive|seduce|provocative|erotic|sensual)\b/i,
  /\b(bikini|underwear|lingerie|bra|panties|thong)\b/i,
  /\b(kiss|make.?out|grinding|twerk|booty)\b/i,
  /\b(lap.?dance|pole.?dance|striptease|exotic)\b/i,
  /\b(topless|shirtless|undress|take.?off|strip)\b/i,
  /\b(touch|grab|grope|spank|slap|fondle)\b.*\b(ass|butt|body|breast)\b/i,
  /\b(moan|groan|dirty|naughty|kinky|lewd)\b/i,
  /\b(only.?fans|fansly|patreon)\b.*\b(exclusive|spicy|adult)\b/i,
  // Gambling/betting
  /\b(bet|gamble|wager)\b.*\b(money|cash|crypto)\b/i,
  /\b(casino|slots|poker|blackjack)\b/i,
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
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Amount thresholds for risk scaling
const RISK_THRESHOLDS = {
  LOW: 50,      // < $50 = low risk
  MEDIUM: 200,  // $50-200 = medium risk
  HIGH: 500,    // $200-500 = high risk
  CRITICAL: 500 // > $500 = critical risk, always flag
};

/**
 * Calculate risk level based on amount
 */
function getRiskLevel(amount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (amount >= RISK_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (amount >= RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (amount >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Moderate dare content
 * @param title - Dare title
 * @param description - Optional description
 * @param amount - Bounty amount in USDC (higher = more scrutiny)
 */
export function moderateDare(title: string, description?: string, amount: number = 0): ModerationResult {
  const content = `${title} ${description || ''}`.toLowerCase();
  const matches: string[] = [];
  const riskLevel = getRiskLevel(amount);

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
        riskLevel,
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

  // Calculate base confidence (0-1)
  let confidence = 0.7;
  confidence -= matches.length * 0.15; // Each flag reduces confidence
  confidence += safeMatches * 0.1; // Each safe match increases confidence

  // Apply amount-based risk penalty
  // Higher amounts = lower confidence = more likely to be flagged
  switch (riskLevel) {
    case 'CRITICAL':
      confidence -= 0.3; // Always triggers review
      if (!flagged) {
        flagged = true;
        matches.push(`high-value ($${amount})`);
      }
      break;
    case 'HIGH':
      confidence -= 0.2;
      break;
    case 'MEDIUM':
      confidence -= 0.1;
      break;
    case 'LOW':
      // No penalty
      break;
  }

  confidence = Math.max(0.1, Math.min(1, confidence)); // Clamp 0.1-1

  // Auto-flag if confidence drops below threshold
  if (confidence < 0.5 && !flagged) {
    flagged = true;
    matches.push('low confidence');
  }

  const reasons: string[] = [];
  if (matches.length > 0) reasons.push(`Matches: ${matches.join(', ')}`);
  if (riskLevel !== 'LOW') reasons.push(`Risk: ${riskLevel} ($${amount})`);

  return {
    allowed: true,
    flagged,
    reason: flagged ? reasons.join(' | ') : null,
    confidence,
    matches,
    riskLevel,
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
