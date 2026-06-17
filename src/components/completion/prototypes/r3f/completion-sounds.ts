/** 記録完了演出用の Web Audio 合成効果音（外部ファイル不要） */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
  return ctx;
}

function env(
  ac: AudioContext,
  t0: number,
  attack: number,
  decay: number,
  peak = 0.35
) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  return g;
}

export function playPenScratch(volume = 0.12) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2800;
  bp.Q.value = 0.8;
  const g = env(ac, t0, 0.004, 0.07, volume);
  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + 0.08);
}

export function playPageFlip(volume = 0.18) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const f = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * f * 0.55;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const g = env(ac, t0, 0.002, 0.1, volume);
  src.connect(hp);
  hp.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + 0.12);
}

/** 重厚な「ドスッ」 */
export function playBookClose(volume = 0.42) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(95, t0);
  osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.22);
  const g = env(ac, t0, 0.006, 0.35, volume);
  const buf = ac.createBuffer(1, ac.sampleRate * 0.18, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;
  const ng = env(ac, t0, 0.004, 0.14, volume * 0.55);
  osc.connect(g);
  noise.connect(lp);
  lp.connect(ng);
  g.connect(ac.destination);
  ng.connect(ac.destination);
  osc.start(t0);
  noise.start(t0);
  osc.stop(t0 + 0.4);
  noise.stop(t0 + 0.18);
}

export function playShelfSlide(volume = 0.22) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.35, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (0.25 + t * 0.15);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(600, t0);
  bp.frequency.linearRampToValueAtTime(1200, t0 + 0.3);
  const g = env(ac, t0, 0.02, 0.32, volume);
  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + 0.35);
}

export function playShelfSettle(volume = 0.3) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(130, t0);
  osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.16);

  const wood = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
  const data = wood.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.32;
  }

  const knock = ac.createBufferSource();
  knock.buffer = wood;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const toneGain = env(ac, t0, 0.004, 0.2, volume * 0.45);
  const knockGain = env(ac, t0 + 0.015, 0.002, 0.09, volume);

  osc.connect(toneGain);
  knock.connect(lp);
  lp.connect(knockGain);
  toneGain.connect(ac.destination);
  knockGain.connect(ac.destination);
  osc.start(t0);
  knock.start(t0 + 0.015);
  osc.stop(t0 + 0.24);
  knock.stop(t0 + 0.12);
}

export function playSparkleChime(volume = 0.14) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  [880, 1175, 1480].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = env(ac, t0 + i * 0.05, 0.004, 0.28, volume * (1 - i * 0.2));
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0 + i * 0.05);
    osc.stop(t0 + 0.35);
  });
}
