/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccessAudioCues } from '../src/app/audio';
import { config } from '../src/config';

describe('createAccessAudioCues', () => {
  let playGranted: ReturnType<typeof vi.fn>;
  let playDenied: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.unstubAllGlobals();
    config.audioEnabled = true;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    playGranted = vi.fn().mockResolvedValue(undefined);
    playDenied = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      preload = '';
      currentTime = 0;
      play = playGranted;
      constructor(src: string) {
        this.play = src.includes('denied') ? playDenied : playGranted;
      }
    }
    vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
  });

  it('plays granted cue on GRANTED when audio is enabled', () => {
    const prev = config.audioEnabled;
    config.audioEnabled = true;
    const cues = createAccessAudioCues();
    cues.play('GRANTED');
    expect(playGranted).toHaveBeenCalledTimes(1);
    expect(playDenied).not.toHaveBeenCalled();
    config.audioEnabled = prev;
  });

  it('plays denied cue on DENIED when audio is enabled', () => {
    const prev = config.audioEnabled;
    config.audioEnabled = true;
    const cues = createAccessAudioCues();
    cues.play('DENIED');
    expect(playDenied).toHaveBeenCalledTimes(1);
    expect(playGranted).not.toHaveBeenCalled();
    config.audioEnabled = prev;
  });

  it('does not play on UNCERTAIN', () => {
    const prev = config.audioEnabled;
    config.audioEnabled = true;
    const cues = createAccessAudioCues();
    cues.play('UNCERTAIN');
    expect(playGranted).not.toHaveBeenCalled();
    expect(playDenied).not.toHaveBeenCalled();
    config.audioEnabled = prev;
  });

  it('does not play when audio is disabled', () => {
    const prev = config.audioEnabled;
    config.audioEnabled = false;
    const cues = createAccessAudioCues();
    cues.play('GRANTED');
    expect(playGranted).not.toHaveBeenCalled();
    config.audioEnabled = prev;
  });
});
