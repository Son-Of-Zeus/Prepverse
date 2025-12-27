/**
 * Focus History Tracking Utility
 * Tracks focus/unfocus periods and calculates statistics
 */

export interface FocusPeriod {
  startTime: number;
  endTime: number | null; // null if still active
  duration: number; // in milliseconds
}

export interface FocusStatistics {
  totalFocusTime: number; // total time focused in milliseconds
  totalUnfocusTime: number; // total time unfocused in milliseconds
  focusPercentage: number; // percentage of session spent focused
  longestFocusPeriod: number; // longest continuous focus period in milliseconds
  longestUnfocusPeriod: number; // longest continuous unfocus period in milliseconds
  averageFocusPeriod: number; // average focus period duration in milliseconds
  focusPeriods: number; // number of focus periods
  unfocusPeriods: number; // number of unfocus periods
  totalInterruptions: number;
}

export class FocusHistoryTracker {
  private focusPeriods: FocusPeriod[] = [];
  private currentFocusStart: number | null = null;
  private sessionStartTime: number;

  constructor(sessionStartTime: number) {
    this.sessionStartTime = sessionStartTime;
    // Start with a focus period
    this.currentFocusStart = sessionStartTime;
  }

  /**
   * Record when focus is lost (interruption starts)
   */
  recordUnfocus(timestamp: number): void {
    if (this.currentFocusStart !== null) {
      // End the current focus period
      const duration = timestamp - this.currentFocusStart;
      this.focusPeriods.push({
        startTime: this.currentFocusStart,
        endTime: timestamp,
        duration,
      });
      this.currentFocusStart = null;
    }
  }

  /**
   * Record when focus is regained (interruption ends)
   */
  recordFocus(timestamp: number): void {
    if (this.currentFocusStart === null) {
      // Start a new focus period
      this.currentFocusStart = timestamp;
    }
  }

  /**
   * Finalize tracking (end of session)
   */
  finalize(endTime: number): void {
    if (this.currentFocusStart !== null) {
      // Close the last focus period
      const duration = endTime - this.currentFocusStart;
      this.focusPeriods.push({
        startTime: this.currentFocusStart,
        endTime,
        duration,
      });
      this.currentFocusStart = null;
    }
  }

  /**
   * Calculate statistics from focus history
   */
  calculateStatistics(sessionEndTime: number, interruptions: Array<{ duration?: number }>): FocusStatistics {
    const totalSessionTime = sessionEndTime - this.sessionStartTime;
    
    // Calculate total focus time
    const totalFocusTime = this.focusPeriods.reduce((sum, period) => sum + period.duration, 0);
    const totalUnfocusTime = totalSessionTime - totalFocusTime;

    // Find longest focus period
    const longestFocusPeriod = this.focusPeriods.length > 0
      ? Math.max(...this.focusPeriods.map(p => p.duration))
      : 0;

    // Calculate longest unfocus period from interruptions
    const longestUnfocusPeriod = interruptions.length > 0
      ? Math.max(...interruptions.map(i => i.duration || 0))
      : 0;

    // Calculate average focus period
    const averageFocusPeriod = this.focusPeriods.length > 0
      ? totalFocusTime / this.focusPeriods.length
      : 0;

    // Calculate focus percentage
    const focusPercentage = totalSessionTime > 0
      ? (totalFocusTime / totalSessionTime) * 100
      : 0;

    return {
      totalFocusTime,
      totalUnfocusTime,
      focusPercentage,
      longestFocusPeriod,
      longestUnfocusPeriod,
      averageFocusPeriod,
      focusPeriods: this.focusPeriods.length,
      unfocusPeriods: interruptions.length,
      totalInterruptions: interruptions.length,
    };
  }

  /**
   * Get all focus periods
   */
  getFocusPeriods(): FocusPeriod[] {
    return [...this.focusPeriods];
  }

  /**
   * Reset tracker
   */
  reset(sessionStartTime: number): void {
    this.focusPeriods = [];
    this.currentFocusStart = sessionStartTime;
    this.sessionStartTime = sessionStartTime;
  }
}

