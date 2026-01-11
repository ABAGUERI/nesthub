export interface Timer {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  startTime: number;
  isPaused: boolean;
  isRinging: boolean;
}

export type TimerStatus = 'running' | 'paused' | 'ringing' | 'stopped';
