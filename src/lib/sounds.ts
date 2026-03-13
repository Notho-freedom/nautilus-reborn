const AUDIO_CONTEXT_CACHE = { ctx: null as AudioContext | null };

function getAudioContext(): AudioContext {
  if (!AUDIO_CONTEXT_CACHE.ctx) {
    AUDIO_CONTEXT_CACHE.ctx = new AudioContext();
  }
  return AUDIO_CONTEXT_CACHE.ctx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playTabOpen() {
  playTone(880, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(1320, 0.06, 'sine', 0.04), 40);
}

export function playTabClose() {
  playTone(660, 0.06, 'sine', 0.05);
  setTimeout(() => playTone(440, 0.08, 'sine', 0.04), 30);
}

export function playTabSwitch() {
  playTone(1000, 0.04, 'sine', 0.03);
}

export function playGroupExpand() {
  playTone(600, 0.05, 'triangle', 0.04);
  setTimeout(() => playTone(800, 0.05, 'triangle', 0.03), 50);
}

export function playGroupCollapse() {
  playTone(800, 0.05, 'triangle', 0.04);
  setTimeout(() => playTone(600, 0.05, 'triangle', 0.03), 50);
}

export function playDropOnTab() {
  playTone(700, 0.06, 'sine', 0.05);
  setTimeout(() => playTone(1050, 0.06, 'sine', 0.04), 60);
  setTimeout(() => playTone(1400, 0.04, 'sine', 0.03), 120);
}

export function playNotification() {
  playTone(523, 0.1, 'sine', 0.06);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.05), 100);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.04), 200);
}

export function playError() {
  playTone(300, 0.15, 'square', 0.04);
  setTimeout(() => playTone(250, 0.2, 'square', 0.03), 150);
}

export function playBookmark() {
  playTone(1200, 0.06, 'sine', 0.05);
}

export function playPrivateMode() {
  playTone(440, 0.08, 'triangle', 0.04);
  setTimeout(() => playTone(330, 0.1, 'triangle', 0.03), 80);
}
