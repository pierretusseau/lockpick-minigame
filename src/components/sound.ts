/**
 * Mini-game sounds, SYNTHESISED with Web Audio: no audio file to load. Short and discreet
 * (metallic clicks, insertion, unlocking). Each sound also has a vibration pattern.
 */

export type GameSound = 'rotate' | 'fit' | 'select' | 'insert' | 'deny' | 'ringOpen' | 'unlock' | 'undo';

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

/** Short filtered noise: the metallic tick of a rotation. */
function tick(ctx: AudioContext, volume: number, frequency = 3200, q = 4, seconds = 0.025, start = 0) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(ctx.currentTime + start);
}

/**
 * Vibration patterns (ms: vibrate, pause, vibrate…), matching the sounds. `navigator.vibrate`
 * works on Android (Chrome, Firefox, Samsung Internet); iPhones ignore it.
 */
const VIBRATIONS: Record<GameSound, number | number[]> = {
  rotate: 6,
  fit: [12, 40, 12, 40, 24],
  select: 4,
  insert: 25,
  deny: [50, 40, 50],
  undo: 15,
  ringOpen: [30, 60, 30],
  unlock: [40, 60, 40, 60, 90],
};

/** Can this device vibrate from a web page? */
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(sound: GameSound): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(VIBRATIONS[sound]);
  } catch {
    // Refused by the browser (no user gesture yet, system setting): no effect.
  }
}

export function playSound(sound: GameSound): void {
  const ctx = audio();
  if (!ctx) return;
  switch (sound) {
    case 'rotate':
      // Muffled click, as if inside the mechanism.
      tick(ctx, 0.1, 1000, 1.2, 0.016);
      break;
    case 'fit':
      // Fitting position: a mechanical rattle (pins dropping into place), three dry clicks and
      // a dull knock — no musical note.
      tick(ctx, 0.1, 1000, 1.2, 0.016);
      tick(ctx, 0.14, 2300, 5, 0.012, 0.035);
      tick(ctx, 0.11, 2700, 5, 0.01, 0.065);
      tick(ctx, 0.08, 2000, 5, 0.01, 0.09);
      tone(ctx, 190, 0.035, 0.06, 'triangle', 0.05);
      break;
    case 'select':
      tone(ctx, 1400, 0, 0.05, 'triangle', 0.05);
      break;
    case 'insert':
      tick(ctx, 0.2, 1600, 1.5, 0.02);
      tone(ctx, 520, 0, 0.08, 'square', 0.04);
      tone(ctx, 780, 0.05, 0.1, 'triangle', 0.05);
      break;
    case 'deny':
      tone(ctx, 140, 0, 0.16, 'sawtooth', 0.04);
      break;
    case 'undo':
      tone(ctx, 600, 0, 0.06, 'triangle', 0.04);
      tone(ctx, 420, 0.05, 0.08, 'triangle', 0.04);
      break;
    case 'ringOpen':
      tone(ctx, 660, 0, 0.15, 'triangle', 0.06);
      tone(ctx, 990, 0.08, 0.2, 'triangle', 0.05);
      break;
    case 'unlock':
      tick(ctx, 0.25, 1600, 1.5, 0.02);
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, 0.06 + i * 0.07, 0.35, 'triangle', 0.06));
      break;
  }
}
