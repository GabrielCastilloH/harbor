export const BLUR_CONFIG = {
  // Server-side blur level for _blurred.jpg
  SERVER_BLUR_PERCENT: 80,

  // Max blur on client-side (used for theatrical phase 1 + real blur in phase 2)
  CLIENT_MAX_BLUR_RADIUS: 80,

  // Message thresholds
  MESSAGES_TO_CLEAR_BLUR: 30, // 100% → 0% fake unblur (really 100% → 80%)
  MESSAGES_TO_CLEAR_ORIGINAL: 50, // 80% → 0% real unblur after consent
};

export function getClientBlurLevel({
  messageCount,
  bothConsented,
}: {
  messageCount: number;
  bothConsented: boolean;
}): number {
  const MAX_CLIENT_BLUR_RADIUS = BLUR_CONFIG.CLIENT_MAX_BLUR_RADIUS;
  const percentageToBlurRadius = (percent: number) =>
    Math.round((percent / 100) * MAX_CLIENT_BLUR_RADIUS);

  if (!bothConsented) {
    // Phase 1: Fake reveal on _blurred.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    // 100% → 0% (theatrical blur, still lands at 80% because server blur remains)
    const blurPercent = 100 * (1 - progress);
    return percentageToBlurRadius(blurPercent);
  } else {
    // Phase 2: Real reveal on _original.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
      1
    );
    // 80% → 0%
    const blurPercent = 80 * (1 - progress);
    return percentageToBlurRadius(blurPercent);
  }
}
