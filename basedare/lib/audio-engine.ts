'use client';

/**
 * BaseDare cinematic audio engine (Web Audio API).
 *
 * Why this exists: the /public/sounds/*.mp3 samples are sub-4KB mono blips that
 * read as retro/toy ("Tamagotchi"). A small sample can't be made to sound
 * expensive. Real-time synthesis can: detuned oscillator stacks, filter sweeps,
 * a sub-bass foundation and a shared convolution-reverb bus give every voice the
 * layered, produced character of a premium product moment.
 *
 * Everything routes through one reverb + limiter bus so the whole app shares a
 * cohesive acoustic "room" instead of ten unrelated beeps.
 */

export type Voice =
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'fund'
  | 'payout'
  | 'connect'
  | 'notification'
  | 'whoosh'
  | 'pop';

interface Bus {
  ctx: AudioContext;
  dry: GainNode; // pre-reverb sum → limiter
  wet: GainNode; // reverb send → convolver → limiter
}

interface NoteOpts {
  attack?: number;
  glideTo?: number;
  detune?: number;
  cutoff?: number;
  cutoffTo?: number;
  q?: number;
  send?: number;
}

let bus: Bus | null = null;
let noiseBuffer: AudioBuffer | null = null;
let engineUsable = true;

function makeCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    return new AC();
  } catch {
    return null;
  }
}

/** Exponentially-decaying stereo noise tail = a cheap, warm algorithmic reverb IR. */
function makeReverbIR(ctx: AudioContext, seconds = 2.6, decay = 3.4): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(seconds * rate));
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i += 1) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return ir;
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function ensureBus(): Bus | null {
  if (!engineUsable) return null;
  if (bus) {
    if (bus.ctx.state === 'suspended') void bus.ctx.resume();
    return bus;
  }

  const ctx = makeCtx();
  if (!ctx) {
    engineUsable = false;
    return null;
  }

  try {
    const master = ctx.createGain();
    master.gain.value = 0.55;

    // Brick-wall-ish limiter so stacked voices never clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;

    const dry = ctx.createGain();
    dry.gain.value = 1;

    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    const convolver = ctx.createConvolver();
    convolver.buffer = makeReverbIR(ctx);

    dry.connect(limiter);
    wet.connect(convolver);
    convolver.connect(limiter);
    limiter.connect(master);
    master.connect(ctx.destination);

    noiseBuffer = makeNoise(ctx);
    bus = { ctx, dry, wet };
    return bus;
  } catch {
    engineUsable = false;
    return null;
  }
}

/** One oscillator voice with an ADSR-ish gain, optional glide + lowpass sweep + reverb send. */
function note(
  b: Bus,
  freq: number,
  type: OscillatorType,
  when: number,
  dur: number,
  peak: number,
  o: NoteOpts = {},
): void {
  const { ctx, dry, wet } = b;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(o.glideTo, 1), when + dur);
  if (o.detune) osc.detune.setValueAtTime(o.detune, when);

  const g = ctx.createGain();
  const attack = o.attack ?? 0.012;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  let head: AudioNode = osc;
  if (o.cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(o.cutoff, when);
    if (o.cutoffTo) filter.frequency.exponentialRampToValueAtTime(o.cutoffTo, when + dur);
    filter.Q.value = o.q ?? 0.7;
    osc.connect(filter);
    head = filter;
  }

  head.connect(g);
  g.connect(dry);
  if (o.send) {
    const s = ctx.createGain();
    s.gain.value = o.send;
    g.connect(s);
    s.connect(wet);
  }

  osc.start(when);
  osc.stop(when + dur + 0.06);
}

/** Filtered-noise sweep — air / whoosh texture. */
function noiseSweep(
  b: Bus,
  when: number,
  dur: number,
  from: number,
  to: number,
  peak: number,
  send = 0.3,
): void {
  const { ctx, dry, wet } = b;
  if (!noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, when);
  filter.frequency.exponentialRampToValueAtTime(to, when + dur);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(dry);
  const s = ctx.createGain();
  s.gain.value = send;
  g.connect(s);
  s.connect(wet);

  src.start(when);
  src.stop(when + dur + 0.06);
}

/** Detuned unison stack — the "expensive" supersaw. */
function stack(
  b: Bus,
  freq: number,
  when: number,
  dur: number,
  peak: number,
  o: NoteOpts = {},
): void {
  note(b, freq, 'sawtooth', when, dur, peak, { ...o, detune: -11 });
  note(b, freq, 'sawtooth', when, dur, peak, { ...o, detune: 11 });
}

function playFund(b: Bus, now: number): void {
  // Sub-bass foundation — weight, dropping slightly for gravity.
  note(b, 55, 'sine', now, 1.05, 0.5, { glideTo: 40, attack: 0.02 });

  // Riser: pitch + filter climbing = the "energising / speeding up" feeling.
  note(b, 150, 'sawtooth', now, 0.46, 0.15, {
    glideTo: 320,
    cutoff: 300,
    cutoffTo: 9000,
    q: 4,
    attack: 0.09,
    send: 0.25,
  });
  noiseSweep(b, now, 0.44, 420, 7200, 0.1, 0.28);

  // Impact: a lush detuned major chord blooms open through the reverb.
  const hit = now + 0.4;
  [220, 277.18, 329.63, 440].forEach((f) => {
    stack(b, f, hit, 0.72, 0.09, {
      attack: 0.006,
      cutoff: 1200,
      cutoffTo: 7200,
      q: 0.8,
      send: 0.4,
    });
  });

  // Shimmer bells — the hypnotic, high, reverb-drenched tail.
  [880, 1318.5, 1760].forEach((f, i) => {
    note(b, f, 'sine', hit + 0.04 + i * 0.05, 0.95, 0.06, { attack: 0.004, send: 0.75 });
  });
}

function playPayout(b: Bus, now: number): void {
  note(b, 60, 'sine', now, 0.7, 0.4, { glideTo: 48, attack: 0.02 });
  // Descending cascade of bells — coins landing.
  [1568, 1318.5, 1046.5, 880, 659.25, 523.25].forEach((f, i) => {
    note(b, f, 'sine', now + i * 0.07, 0.7, 0.08, { attack: 0.004, send: 0.6 });
    note(b, f * 2, 'sine', now + i * 0.07, 0.4, 0.03, { attack: 0.004, send: 0.5 });
  });
}

export function playVoice(voice: Voice): boolean {
  const b = ensureBus();
  if (!b) return false;

  try {
    const now = b.ctx.currentTime + 0.001;
    switch (voice) {
      case 'fund':
        playFund(b, now);
        break;
      case 'payout':
        playPayout(b, now);
        break;
      case 'whoosh':
        noiseSweep(b, now, 0.34, 480, 6200, 0.14, 0.35);
        break;
      case 'pop':
        note(b, 520, 'sine', now, 0.16, 0.2, { glideTo: 170, attack: 0.002, send: 0.15 });
        break;
      case 'click':
        note(b, 1200, 'sine', now, 0.05, 0.12, { glideTo: 900, attack: 0.002 });
        break;
      case 'hover':
        note(b, 2100, 'sine', now, 0.04, 0.035, { attack: 0.002 });
        break;
      case 'connect':
        note(b, 329.63, 'triangle', now, 0.5, 0.16, { attack: 0.01, send: 0.4 });
        note(b, 493.88, 'triangle', now + 0.09, 0.55, 0.16, { attack: 0.01, send: 0.45 });
        break;
      case 'success':
        [523.25, 659.25, 783.99].forEach((f, i) => {
          note(b, f, 'triangle', now + i * 0.08, 0.5, 0.13, { attack: 0.006, send: 0.5 });
          note(b, f, 'sine', now + i * 0.08, 0.5, 0.06, { attack: 0.006, send: 0.4 });
        });
        break;
      case 'notification':
        note(b, 880, 'triangle', now, 0.32, 0.12, { attack: 0.006, send: 0.4 });
        note(b, 1174.66, 'triangle', now + 0.11, 0.36, 0.11, { attack: 0.006, send: 0.4 });
        break;
      case 'error':
        note(b, 150, 'sawtooth', now, 0.34, 0.14, { detune: -18, cutoff: 900, attack: 0.005 });
        note(b, 150, 'sawtooth', now, 0.34, 0.14, { detune: 18, cutoff: 900, attack: 0.005 });
        break;
      default:
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Resume/create the context inside a user gesture so the first tap reliably sounds. */
export function unlockAudio(): void {
  const b = ensureBus();
  if (b && b.ctx.state === 'suspended') void b.ctx.resume();
}

export function isAudioEngineAvailable(): boolean {
  return engineUsable;
}
