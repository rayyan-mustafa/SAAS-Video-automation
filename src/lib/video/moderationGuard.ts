/**
 * Moderation Guard for Content Prompts & Narration Edits.
 * Enforces YouTube Inauthentic Content Policy, Anti-Deepfake / Celebrity Likeness rules,
 * and Scam / Misleading Claim protections.
 *
 * Runs:
 * 1. At PLAN creation
 * 2. On Storyboard narration edits
 * 3. On Scene Editor re-voicing / text updates
 */

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  flaggedCategory?: 'DEEPFAKE_CELEBRITY' | 'SCAM_MISLEADING' | 'HARMFUL_POLICY';
}

const CELEBRITY_POLITICAL_PATTERNS = [
  /\b(deepfake|clone\s+voice\s+of|impersonat(e|ing)|ai\s+elon\s+musk|ai\s+biden|ai\s+trump|ai\s+obama|ai\s+putin|ai\s+taylor\s+swift)\b/i,
  /\b(elon\s+musk|joe\s+biden|donald\s+trump|barack\s+obama|vladimir\s+putin)\s+(said|confessed|exposed|claims\s+he\s+will|announces\s+crypto)\b/i,
];

const SCAM_MISLEADING_PATTERNS = [
  /\b(guaranteed\s+(returns?|\d+%?|profit|wealth)|\d+%\s+guaranteed|crypto\s+giveaway|send\s+0\.\d+\s+btc|double\s+your\s+money)\b/i,
  /\b(secret\s+cure\s+for\s+cancer|doctors\s+don't\s+want\s+you\s+to\s+know|miracle\s+cure|fda\s+hiding\s+this)\b/i,
  /\b(guaranteed\s+monetization|hack\s+the\s+algorithm\s+for\s+instant\s+1m\s+subs)\b/i,
];

/**
 * Validates a prompt, script, or edited narration string against YouTube compliance rules.
 */
export function validateNarrationModeration(text: string): ModerationResult {
  if (!text || !text.trim()) {
    return { allowed: true };
  }

  const cleanText = text.trim();

  // 1. Deepfake & Celebrity/Politician Likeness Guard
  for (const pattern of CELEBRITY_POLITICAL_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        allowed: false,
        reason: 'Violation of YouTube Inauthentic Content Policy: Unapproved real-person celebrity or political likeness detected.',
        flaggedCategory: 'DEEPFAKE_CELEBRITY',
      };
    }
  }

  // 2. Scam, Financial Fraud & Misleading Claims Guard
  for (const pattern of SCAM_MISLEADING_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        allowed: false,
        reason: 'Violation of Content Safety Policy: Sensationalist financial scam or dangerous medical claim detected.',
        flaggedCategory: 'SCAM_MISLEADING',
      };
    }
  }

  return { allowed: true };
}
