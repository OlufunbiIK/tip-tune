export const COMBO_SOUND_STORAGE_KEY = 'tiptune.combo.sound.enabled.v1';

let audioContext: AudioContext | null = null;

export const isComboSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(COMBO_SOUND_STORAGE_KEY);
  if (raw == null) return true;
  return raw === 'true';
};

export const setComboSoundEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMBO_SOUND_STORAGE_KEY, String(enabled));
};

export const playComboSound = (multiplier: number): void => {
  if (typeof window === 'undefined' || !isComboSoundEnabled()) return;

  const AudioContextImpl =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextImpl) return;

  audioContext = audioContext ?? new AudioContextImpl();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => undefined);
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const frequency = 280 + Math.min(multiplier, 8) * 45;

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
};
