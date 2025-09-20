export const BLUR_CONFIG = {
  // Server-side blur level for _blurred.jpg
  SERVER_BLUR_PERCENT: 80,

  // Max blur on client-side (used for theatrical phase 1 + real blur in phase 2)
  CLIENT_MAX_BLUR_RADIUS: 40, // Changed from 45 to 40 as requested

  // Message thresholds
  MESSAGES_TO_CLEAR_BLUR: 30, // 100% → 0% fake unblur (really 100% → 80%)
  MESSAGES_TO_CLEAR_ORIGINAL: 10, // 80% → 0% real unblur after consent (changed from 40 to 10)
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
    const phase2Messages = Math.max(
      0,
      messageCount - BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR
    );
    const progress = Math.min(
      phase2Messages / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
      1
    );
    // 80% → 0%
    const blurPercent = BLUR_CONFIG.SERVER_BLUR_PERCENT * (1 - progress);
    return percentageToBlurRadius(blurPercent);
  }
}

/**
 * Get client blur level for group matches
 * All members must consent for real unblur to begin
 */
export function getGroupClientBlurLevel({
  messageCount,
  allMembersConsented,
}: {
  messageCount: number;
  allMembersConsented: boolean;
}): number {
  const MAX_CLIENT_BLUR_RADIUS = BLUR_CONFIG.CLIENT_MAX_BLUR_RADIUS;
  const percentageToBlurRadius = (percent: number) =>
    Math.round((percent / 100) * MAX_CLIENT_BLUR_RADIUS);

  if (!allMembersConsented) {
    // Phase 1: Fake reveal on _blurred.jpg (all group members see this)
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    // 100% → 0% (theatrical blur, still lands at 80% because server blur remains)
    const blurPercent = 100 * (1 - progress);
    return percentageToBlurRadius(blurPercent);
  } else {
    // Phase 2: Real reveal on _original.jpg (only after ALL members consent)
    const phase2Messages = Math.max(
      0,
      messageCount - BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR
    );
    const progress = Math.min(
      phase2Messages / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
      1
    );
    // 80% → 0%
    const blurPercent = BLUR_CONFIG.SERVER_BLUR_PERCENT * (1 - progress);
    return percentageToBlurRadius(blurPercent);
  }
}

/**
 * Returns the emulated blur percentage remaining (0-100) that we surface to users.
 * This abstracts whether we are viewing _blurred or _original; it reflects the UX model.
 */
export function getEmulatedBlurPercent({
  messageCount,
  bothConsented,
}: {
  messageCount: number;
  bothConsented: boolean;
}): number {
  // Phase 1: 100% -> 0% over MESSAGES_TO_CLEAR_BLUR
  if (!bothConsented) {
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    const remaining = 100 * (1 - progress);
    return Math.round(remaining);
  }
  // Phase 2: emulate 80% -> 0% over MESSAGES_TO_CLEAR_ORIGINAL
  const phase2Messages = Math.max(
    0,
    messageCount - BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR
  );
  const progress = Math.min(
    phase2Messages / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
    1
  );
  const remaining = BLUR_CONFIG.SERVER_BLUR_PERCENT * (1 - progress);
  return Math.round(remaining);
}

/**
 * Get emulated blur percentage for group matches
 * All members must consent for real unblur to begin
 */
export function getGroupEmulatedBlurPercent({
  messageCount,
  allMembersConsented,
}: {
  messageCount: number;
  allMembersConsented: boolean;
}): number {
  // Phase 1: 100% -> 0% over MESSAGES_TO_CLEAR_BLUR
  if (!allMembersConsented) {
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    const remaining = 100 * (1 - progress);
    return Math.round(remaining);
  }
  // Phase 2: emulate 80% -> 0% over MESSAGES_TO_CLEAR_ORIGINAL
  const phase2Messages = Math.max(
    0,
    messageCount - BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR
  );
  const progress = Math.min(
    phase2Messages / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
    1
  );
  const remaining = BLUR_CONFIG.SERVER_BLUR_PERCENT * (1 - progress);
  return Math.round(remaining);
}

/**
 * Returns a single unified clarity percentage (0-100) that maps the two-phase
 * reveal into one smooth scale. This intentionally ignores the internal
 * distinction between theatrical blur (Phase 1) and real reveal (Phase 2).
 *
 * - During Phase 1 (pre-consent): clarity linearly increases from 0% → (100 - SERVER_BLUR_PERCENT)%
 *   over MESSAGES_TO_CLEAR_BLUR messages. With SERVER_BLUR_PERCENT=80, this is 0% → 20%.
 * - During Phase 2 (post-consent): clarity continues from (100 - SERVER_BLUR_PERCENT)% → 100%
 *   over MESSAGES_TO_CLEAR_ORIGINAL messages.
 */
export function getUnifiedClarityPercent({
  messageCount,
  bothConsented,
}: {
  messageCount: number;
  bothConsented: boolean;
}): number {
  const stageOneGain = 100 - BLUR_CONFIG.SERVER_BLUR_PERCENT; // e.g., 20
  const stageTwoGain = BLUR_CONFIG.SERVER_BLUR_PERCENT; // e.g., 80

  if (!bothConsented) {
    // Phase 1: progress from 0 → stageOneGain
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    return Math.round(stageOneGain * progress);
  }

  // Phase 2: continue from stageOneGain → 100
  const phase2Messages = Math.max(
    0,
    messageCount - BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR
  );
  const progress = Math.min(
    phase2Messages / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
    1
  );
  const clarity = stageOneGain + stageTwoGain * progress; // 20 + 80*progress
  return Math.round(clarity);
}

/**
 * Get unified clarity percentage for group matches
 * All members must consent for real unblur to begin
 */
export function getGroupUnifiedClarityPercent({
  messageCount,
  allMembersConsented,
}: {
  messageCount: number;
  allMembersConsented: boolean;
}): number {
  const stageOneGain = 100 - BLUR_CONFIG.SERVER_BLUR_PERCENT; // e.g., 20
  const stageTwoGain = BLUR_CONFIG.SERVER_BLUR_PERCENT; // e.g., 80

  if (!allMembersConsented) {
    // Phase 1: progress from 0 → stageOneGain
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    return Math.round(stageOneGain * progress);
  }

  // Phase 2: continue from stageOneGain → 100
  const phase2Messages = Math.max(
    0,
    messageCount - BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR
  );
  const progress = Math.min(
    phase2Messages / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
    1
  );
  const clarity = stageOneGain + stageTwoGain * progress; // 20 + 80*progress
  return Math.round(clarity);
}
