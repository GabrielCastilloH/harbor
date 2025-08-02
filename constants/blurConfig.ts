export const BLUR_CONFIG = {
  // Server-side blur for _blurred.jpg images
  SERVER_BLUR_PERCENT: 100,

  // Client-side blur levels
  CLIENT_INITIAL_BLUR_PERCENT: 90, // Initial client-side blur after consent

  // Message thresholds
  MESSAGES_TO_CLEAR_BLUR: 30, // Messages to fully reveal _blurred.jpg
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
    // Progressively reveal _blurred.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    return Math.round(BLUR_CONFIG.SERVER_BLUR_PERCENT * (1 - progress));
  } else {
    // Progressively reveal _original.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
      1
    );
    return Math.round(BLUR_CONFIG.CLIENT_INITIAL_BLUR_PERCENT * (1 - progress));
  }
}
