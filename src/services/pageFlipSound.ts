/**
 * Soft paper page-flip SFX via Web Audio (no binary assets).
 * Autoplay-safe: resumes AudioContext on first user gesture.
 *
 * Modes:
 * - normal — reading flips
 * - rapid  — End Session rewind (quieter, tighter, rate-limited)
 * - force  — cover open/close (always plays once)
 */

const MUTE_KEY = 'stringstack-reader:flip-sound-muted';
const MIN_GAP_MS = 90;
/** Match FlipBookReader rewind step (~170–200ms) so one soft tick per leaf. */
const RAPID_GAP_MS = 155;

export type PageFlipSoundMode = 'normal' | 'rapid';

let audioCtx: AudioContext | null = null;
let lastPlayAt = 0;
let gestureBound = false;

function getMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isPageFlipSoundMuted(): boolean {
  return getMuted();
}

export function setPageFlipSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore quota / private mode
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

/** Call once from UI so the first flip is not silent (browser autoplay policy). */
export function unlockPageFlipSound(): void {
  if (gestureBound) return;
  gestureBound = true;

  const ctx = ensureContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
}

export function bindPageFlipSoundUnlock(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const unlock = () => unlockPageFlipSound();
  const opts: AddEventListenerOptions = { capture: true, once: true, passive: true };

  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
  window.addEventListener('touchstart', unlock, opts);

  return () => {
    window.removeEventListener('pointerdown', unlock, { capture: true });
    window.removeEventListener('keydown', unlock, { capture: true });
    window.removeEventListener('touchstart', unlock, { capture: true });
  };
}

/**
 * Play a short paper rustle + soft thump.
 * @param options.force — play even if gap throttle would skip (cover open/close)
 * @param options.mode — `rapid` for End Session page rewind (softer flutter)
 */
export function playPageFlipSound(options?: {
  force?: boolean;
  mode?: PageFlipSoundMode;
}): void {
  if (getMuted()) return;

  const mode: PageFlipSoundMode = options?.mode ?? 'normal';
  const now = performance.now();
  const gap = mode === 'rapid' ? RAPID_GAP_MS : MIN_GAP_MS;

  if (!options?.force && now - lastPlayAt < gap) return;
  lastPlayAt = now;

  const ctx = ensureContext();
  if (!ctx) return;

  const play = () => synthesizeFlip(ctx, mode);

  if (ctx.state === 'suspended') {
    void ctx.resume().then(play);
    return;
  }

  play();
}

function synthesizeFlip(ctx: AudioContext, mode: PageFlipSoundMode): void {
  const rapid = mode === 'rapid';
  const t0 = ctx.currentTime;

  const peak = rapid ? 0.12 : 0.22;
  const rustleGain = rapid ? 0.38 : 0.55;
  const thumpPeak = rapid ? 0.1 : 0.18;
  const duration = rapid ? 0.11 : 0.16;
  const settleMs = rapid ? 0.16 : 0.22;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + settleMs);
  master.connect(ctx.destination);

  // Broadband paper rustle
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    const env = Math.pow(1 - i / sampleCount, rapid ? 2.2 : 1.8);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(rapid ? 1600 : 1400, t0);
  band.frequency.exponentialRampToValueAtTime(rapid ? 1100 : 900, t0 + duration * 0.75);
  band.Q.value = 0.7;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(rustleGain, t0);

  noise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(t0);
  noise.stop(t0 + duration);

  // Soft low thump as the page settles
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(rapid ? 160 : 180, t0);
  osc.frequency.exponentialRampToValueAtTime(rapid ? 85 : 70, t0 + 0.07);

  const thump = ctx.createGain();
  thump.gain.setValueAtTime(0.0001, t0);
  thump.gain.exponentialRampToValueAtTime(thumpPeak, t0 + 0.008);
  thump.gain.exponentialRampToValueAtTime(0.0001, t0 + (rapid ? 0.08 : 0.1));

  osc.connect(thump);
  thump.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}
