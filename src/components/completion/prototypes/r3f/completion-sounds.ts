/**
 * 記録完了演出用の Web Audio 合成効果音（外部ファイル不要）。
 *
 * 音の扱いで決めたこと（2026-08-17）:
 * - **鳴らすかどうかは端末内の設定で持ち、既定はOFF**（`src/lib/completion-sound.ts`）。
 *   ここは「鳴らすと決まったときに、どう鳴らすか」だけを持つ。
 * - **自動再生ブロックは、待つのではなく操作の中で解く。** AudioContext は
 *   ページを開いた時点ではなく、本人がボタンを押した流れの中で `unlockAudio()` を
 *   呼んで作る。ブラウザは操作から始まった生成・再開だけを許すため、
 *   「作っておいて後で resume する」形にすると端末によっては suspended のまま残る。
 * - **止まったままの AudioContext には何も積まない。** 再生できない状態で音を
 *   組み立てても、無音のまま処理だけが走る。`running` でなければ即座に戻る。
 * - 全体の音量はマスターで一段下げる。夜に開くことを想定した画面で、
 *   本を閉じる音が一番大きい音として鳴る状態にしない。
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** 全体の音量。個々の音は互いの釣り合いだけを持ち、絶対量はここで決める */
const MASTER_VOLUME = 0.5;

type AudioContextConstructor = new () => AudioContext;

function audioContextCtor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitAudioContext?: AudioContextConstructor };
  return (window.AudioContext as AudioContextConstructor | undefined) ??
    w.webkitAudioContext ??
    null;
}

/**
 * 本人の操作（クリック・タップ）の流れの中から呼ぶ。
 * ここで AudioContext を作り、必要なら再開する。
 */
export function unlockAudio(): void {
  const Ctor = audioContextCtor();
  if (!Ctor) return;

  try {
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
  } catch {
    ctx = null;
    master = null;
  }
}

/** いま実際に音を出せる状態か */
export function isAudioReady(): boolean {
  return ctx !== null && ctx.state === "running";
}

/** 演出を離れるときに解放する。開いたままの AudioContext を残さない */
export function releaseAudio(): void {
  const closing = ctx;
  ctx = null;
  master = null;
  if (!closing) return;
  try {
    void closing.close().catch(() => undefined);
  } catch {
    // 閉じられない環境でも、参照は外したので次回は作り直しになる
  }
}

/** 出力先。鳴らせない状態なら null を返し、呼び出し側は何も組み立てない */
function out(): { ac: AudioContext; dest: GainNode } | null {
  if (!ctx || !master || ctx.state !== "running") return null;
  return { ac: ctx, dest: master };
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
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  return g;
}

/** 控えめな万年筆音 */
export function playPenScratch(volume = 0.07) {
  const o = out();
  if (!o) return;
  const { ac, dest } = o;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.32;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  // 2600Hz は耳につく帯域だった。紙をなでる音の側へ寄せる
  bp.frequency.value = 1900;
  bp.Q.value = 0.6;
  const g = env(ac, t0, 0.004, 0.055, volume);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + 0.06);
}

/** 短いページめくり */
export function playPageFlip(volume = 0.12) {
  const o = out();
  if (!o) return;
  const { ac, dest } = o;
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
  hp.frequency.value = 700;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  // 高い方を切って、擦れの角を落とす
  lp.frequency.value = 5200;
  const g = env(ac, t0, 0.004, 0.075, volume);
  src.connect(hp);
  hp.connect(lp);
  lp.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + 0.09);
}

/** 低く柔らかい「とん」— 閉じる山場 */
export function playBookClose(volume = 0.34) {
  const o = out();
  if (!o) return;
  const { ac, dest } = o;
  const t0 = ac.currentTime;

  const thump = ac.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(78, t0);
  thump.frequency.exponentialRampToValueAtTime(38, t0 + 0.28);
  // 立ち上がりを鈍らせる。速すぎるとクリック音として聞こえる
  const thumpGain = env(ac, t0, 0.018, 0.46, volume);

  const body = ac.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(52, t0);
  body.frequency.exponentialRampToValueAtTime(32, t0 + 0.35);
  const bodyGain = env(ac, t0 + 0.01, 0.022, 0.4, volume * 0.55);

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
  const noiseGain = env(ac, t0, 0.008, 0.12, volume * 0.3);

  thump.connect(thumpGain);
  body.connect(bodyGain);
  noise.connect(lp);
  lp.connect(noiseGain);
  thumpGain.connect(dest);
  bodyGain.connect(dest);
  noiseGain.connect(dest);

  thump.start(t0);
  body.start(t0 + 0.01);
  noise.start(t0);
  thump.stop(t0 + 0.5);
  body.stop(t0 + 0.45);
  noise.stop(t0 + 0.16);
}

/** 棚へ滑り込む木と紙の摩擦 */
export function playShelfSlide(volume = 0.17) {
  const o = out();
  if (!o) return;
  const { ac, dest } = o;
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
  bp.frequency.setValueAtTime(420, t0);
  bp.frequency.linearRampToValueAtTime(780, t0 + 0.35);
  bp.Q.value = 0.6;
  const g = env(ac, t0, 0.035, 0.38, volume);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + 0.42);
}

/** 棚に収まる接触音 */
export function playShelfSettle(volume = 0.26) {
  const o = out();
  if (!o) return;
  const { ac, dest } = o;
  const t0 = ac.currentTime;

  const knock = ac.createOscillator();
  knock.type = "sine";
  knock.frequency.setValueAtTime(118, t0);
  knock.frequency.exponentialRampToValueAtTime(62, t0 + 0.18);
  const knockGain = env(ac, t0, 0.01, 0.24, volume * 0.7);

  const wood = ac.createBuffer(1, ac.sampleRate * 0.11, ac.sampleRate);
  const data = wood.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.28;
  }
  const scrape = ac.createBufferSource();
  scrape.buffer = wood;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 340;
  const scrapeGain = env(ac, t0 + 0.008, 0.005, 0.1, volume * 0.8);

  knock.connect(knockGain);
  scrape.connect(lp);
  lp.connect(scrapeGain);
  knockGain.connect(dest);
  scrapeGain.connect(dest);
  knock.start(t0);
  scrape.start(t0 + 0.008);
  knock.stop(t0 + 0.3);
  scrape.stop(t0 + 0.12);
}

/**
 * 収納後のごく短い余韻。
 * 高い純音は通知音に聞こえるので、低い側へ移して減衰を伸ばす。
 */
export function playSparkleChime(volume = 0.06) {
  const o = out();
  if (!o) return;
  const { ac, dest } = o;
  const t0 = ac.currentTime;
  [523, 659].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = env(ac, t0 + i * 0.09, 0.02, 0.42, volume * (1 - i * 0.3));
    osc.connect(g);
    g.connect(dest);
    osc.start(t0 + i * 0.09);
    osc.stop(t0 + 0.62);
  });
}
