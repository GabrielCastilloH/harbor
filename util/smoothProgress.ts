export interface SmoothProgressOptions {
  duration?: number; // Total duration in milliseconds (default: 8000ms)
  onProgress?: (progress: number) => void; // Callback for progress updates
  onComplete?: () => void; // Callback when progress reaches 100%
}

export class SmoothProgress {
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private duration: number;
  private onProgress: (progress: number) => void;
  private onComplete?: () => void;
  private isRunning: boolean = false;

  constructor(options: SmoothProgressOptions = {}) {
    this.duration = options.duration || 8000; // 8 seconds default
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete;
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();


    const updateProgress = () => {
      if (!this.isRunning) {
        return;
      }

      const elapsed = Date.now() - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);

      // Use an easing function for more natural progress
      const easedProgress = this.easeOutCubic(progress);

      this.onProgress(easedProgress);

      if (progress >= 1) {
        this.stop();
        this.onComplete?.();
      }
    };

    // Update every 50ms for smooth animation
    this.intervalId = setInterval(updateProgress, 50);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  // Easing function for more natural progress curve
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // Get current progress (0 to 1)
  getCurrentProgress(): number {
    if (!this.isRunning) {
      return 0;
    }
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    return this.easeOutCubic(progress);
  }
}

// Utility function to create and start smooth progress
export function createSmoothProgress(
  onProgress: (progress: number) => void,
  options: Omit<SmoothProgressOptions, "onProgress"> = {}
): SmoothProgress {
  const smoothProgress = new SmoothProgress({
    ...options,
    onProgress,
  });

  smoothProgress.start();
  return smoothProgress;
}
