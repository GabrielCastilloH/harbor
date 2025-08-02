export const BLUR_CONFIG = {
  // Server-side blur for _blurred.jpg images (highly blurred)
  SERVER_BLUR_PERCENT: 90,

  // Client-side blur levels
  CLIENT_INITIAL_BLUR_PERCENT: 90, // Matches server-side blur after consent

  // Message thresholds for progressive reveal
  MESSAGES_TO_CLEAR_BLUR: 30, // Messages to fully reveal _blurred.jpg (fake reveal)
  MESSAGES_TO_CLEAR_ORIGINAL: 50, // Messages to fully reveal _original.jpg after consent

  // Consent thresholds
  CONSENT_REQUIRED_MESSAGES: 30, // Messages needed before consent screen appears
};

export function getClientBlurLevel({
  messageCount,
  bothConsented,
}: {
  messageCount: number;
  bothConsented: boolean;
}): number {
  if (!bothConsented) {
    // Phase 1: Progressive reveal of _blurred.jpg (fake reveal)
    // Blur goes from 100% to 0% over MESSAGES_TO_CLEAR_BLUR messages
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    return Math.round(100 * (1 - progress)); // 100% to 0%
  } else {
    // Phase 2: Progressive reveal of _original.jpg after consent
    // Start at CLIENT_INITIAL_BLUR_PERCENT (90%) and go to 0% over MESSAGES_TO_CLEAR_ORIGINAL messages
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
      1
    );
    return Math.round(BLUR_CONFIG.CLIENT_INITIAL_BLUR_PERCENT * (1 - progress));
  }
}
