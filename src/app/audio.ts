import { config } from '../config';
import type { Decision } from '../domain/types';

const GRANTED_SRC = '/audio/granted.mp3';
const DENIED_SRC = '/audio/denied.mp3';

export type AccessAudioCues = {
  /** Plays chime on GRANTED, buzzer on DENIED; skips UNCERTAIN and when `config.audioEnabled` is false. */
  play(decision: Decision): void;
};

/**
 * Preloads cue files at construction (call once per gate session after user gesture path is available).
 */
export function createAccessAudioCues(): AccessAudioCues {
  const granted = new Audio(GRANTED_SRC);
  const denied = new Audio(DENIED_SRC);
  granted.preload = 'auto';
  denied.preload = 'auto';

  return {
    play(decision: Decision) {
      if (!config.audioEnabled) return;
      if (decision === 'UNCERTAIN') return;
      const el = decision === 'GRANTED' ? granted : denied;
      el.currentTime = 0;
      void el.play().catch(() => {});
    },
  };
}
