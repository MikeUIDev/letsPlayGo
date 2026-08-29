/** Original short tones synthesized with Web Audio — no external assets. */
let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioCtor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  if (!sharedContext) {
    sharedContext = new AudioCtor();
  }

  if (sharedContext.state === 'suspended') {
    void sharedContext.resume();
  }

  return sharedContext;
}

function playTone(
  frequency: number,
  durationSec: number,
  gainPeak: number,
  type: OscillatorType = 'sine',
  startOffsetSec = 0,
): void {
  const context = getContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + startOffsetSec;
  const endAt = startAt + durationSec;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(gainPeak, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt);
}

export function synthesizePlacementSound(): void {
  playTone(920, 0.045, 0.07, 'triangle');
}

export function synthesizeCaptureSound(): void {
  playTone(520, 0.05, 0.08, 'square');
  playTone(780, 0.06, 0.06, 'triangle', 0.02);
}

export function synthesizeSuccessSound(): void {
  playTone(523.25, 0.07, 0.07, 'sine');
  playTone(659.25, 0.08, 0.06, 'sine', 0.07);
  playTone(783.99, 0.1, 0.05, 'sine', 0.15);
}

export function synthesizeGameOverSound(): void {
  playTone(392, 0.12, 0.05, 'sine');
  playTone(523.25, 0.14, 0.04, 'sine', 0.1);
}

/** Test helper */
export function resetAudioContextForTests(): void {
  sharedContext = null;
}
