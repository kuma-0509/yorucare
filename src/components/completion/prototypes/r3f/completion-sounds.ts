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

/** 控えめな万年筆音 */
export function playPenScratch(volume = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.32;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 0.7;
  const g = env(ac, t0, 0.003, 0.055, volume);
  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + 0.06);
}

/** 短いページめくり */
export function playPageFlip(volume = 0.14) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.09, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const f = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * f * 0.45;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 850;
  const g = env(ac, t0, 0.002, 0.075, volume);
  src.connect(hp);
  hp.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + 0.09);
}

/** 低く柔らかい「ドスッ」— 閉じる山場 */
export function playBookClose(volume = 0.48) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;

  const thump = ac.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(78, t0);
  thump.frequency.exponentialRampToValueAtTime(38, t0 + 0.28);
  const thumpGain = env(ac, t0, 0.008, 0.42, volume);

  const body = ac.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(52, t0);
  body.frequency.exponentialRampToValueAtTime(32, t0 + 0.35);
  const bodyGain = env(ac, t0 + 0.01, 0.012, 0.38, volume * 0.55);

  const buf = ac.createBuffer(1, ac.sampleRate * 0.16, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * 0.18;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 180;
  const noiseGain = env(ac, t0, 0.005, 0.12, volume * 0.35);

  thump.connect(thumpGain);
  body.connect(bodyGain);
  noise.connect(lp);
  lp.connect(noiseGain);
  thumpGain.connect(ac.destination);
  bodyGain.connect(ac.destination);
  noiseGain.connect(ac.destination);

  thump.start(t0);
  body.start(t0 + 0.01);
  noise.start(t0);
  thump.stop(t0 + 0.45);
  body.stop(t0 + 0.42);
  noise.stop(t0 + 0.16);
}

/** 棚へ滑り込む木と紙の摩擦 */
export function playShelfSlide(volume = 0.2) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.42, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (0.18 + t * 0.12);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(480, t0);
  bp.frequency.linearRampToValueAtTime(920, t0 + 0.35);
  bp.Q.value = 0.6;
  const g = env(ac, t0, 0.025, 0.38, volume);
  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + 0.42);
}

/** 棚に収まる接触音 */
export function playShelfSettle(volume = 0.36) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;

  const knock = ac.createOscillator();
  knock.type = "sine";
  knock.frequency.setValueAtTime(118, t0);
  knock.frequency.exponentialRampToValueAtTime(62, t0 + 0.18);
  const knockGain = env(ac, t0, 0.004, 0.22, volume * 0.7);

  const wood = ac.createBuffer(1, ac.sampleRate * 0.11, ac.sampleRate);
  const data = wood.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.28;
  }
  const scrape = ac.createBufferSource();
  scrape.buffer = wood;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const scrapeGain = env(ac, t0 + 0.008, 0.003, 0.1, volume * 0.85);

  knock.connect(knockGain);
  scrape.connect(lp);
  lp.connect(scrapeGain);
  knockGain.connect(ac.destination);
  scrapeGain.connect(ac.destination);
  knock.start(t0);
  scrape.start(t0 + 0.008);
  knock.stop(t0 + 0.26);
  scrape.stop(t0 + 0.12);
}

/** 収納後のごく短い余韻 */
export function playSparkleChime(volume = 0.07) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  [784, 988].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = env(ac, t0 + i * 0.06, 0.005, 0.22, volume * (1 - i * 0.25));
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0 + i * 0.06);
    osc.stop(t0 + 0.28);
  });
}
