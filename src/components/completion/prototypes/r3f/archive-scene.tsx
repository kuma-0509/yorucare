"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { AntiqueBook } from "./antique-book";
import { Bookshelf } from "./bookshelf";
import { SparkleParticles } from "./sparkle-particles";
import {
  isAudioReady,
  playBookClose,
  playPageFlip,
  playPenScratch,
  playShelfSettle,
  playShelfSlide,
  playSparkleChime,
} from "./completion-sounds";
import { createWoodMaterial } from "./materials";
import { spineCameraDistance } from "./framing";
import { useArchiveEnvironment } from "./environment";
import { GlowSprite } from "./glow-sprite";
import { getSlotWorldCenter } from "./shelf-layout";
import { qualityFor, type SceneQuality } from "./quality";
import {
  SOUND_CUES,
  TIMELINE,
  isShelvedPhase,
  phaseTimeMs,
  prefersReducedMotion,
  shelfGlowAt,
  shelfTAt,
  shouldPlaySoundCue,
  useCinematicTimeline,
  type CinematicPhase,
  type SoundCueKey,
} from "./use-cinematic-timeline";

interface ArchiveSceneProps {
  lines: string[];
  heading?: string;
  soundEnabled?: boolean;
  quality?: SceneQuality;
  onDone?: () => void;
}

const CAMERA_KEYS: Record<
  CinematicPhase,
  { pos: THREE.Vector3; target: THREE.Vector3 }
> = {
  writing: {
    pos: new THREE.Vector3(0.08, 0.22, 2.05),
    target: new THREE.Vector3(0, 0.02, 0),
  },
  pageFlip: {
    pos: new THREE.Vector3(0.05, 0.28, 2.18),
    target: new THREE.Vector3(0, 0.04, 0.02),
  },
  closing: {
    pos: new THREE.Vector3(0, 0.42, 2.95),
    target: new THREE.Vector3(0, -0.02, 0),
  },
  spine: {
    pos: new THREE.Vector3(1.55, 0.18, 1.72),
    target: new THREE.Vector3(-0.2, 0.02, 0.04),
  },
  shelving: {
    pos: new THREE.Vector3(0.12, -0.28, 2.55),
    target: new THREE.Vector3(0, -1.38, 0.04),
  },
  afterglow: {
    pos: new THREE.Vector3(0.04, -0.2, 2.88),
    target: new THREE.Vector3(0, -1.4, 0.06),
  },
  done: {
    pos: new THREE.Vector3(0.04, -0.16, 3.02),
    target: new THREE.Vector3(0, -1.4, 0.06),
  },
};

function impactPulse(t: number) {
  if (t < 0.86) return 0;
  const local = Math.min(1, (t - 0.86) / 0.14);
  return Math.sin(local * Math.PI);
}

/** 合図ごとに鳴らすもの。鳴らす位置は `SOUND_CUES` が持つ */
const SOUND_PLAYERS: Record<SoundCueKey, () => void> = {
  pen1: () => playPenScratch(),
  pen2: () => playPenScratch(0.06),
  pen3: () => playPenScratch(0.05),
  flip: () => playPageFlip(),
  close: playBookClose,
  slide: playShelfSlide,
  settle: playShelfSettle,
  chime: () => playSparkleChime(),
};

export function ArchiveScene({
  lines,
  heading,
  soundEnabled = false,
  quality,
  onDone,
}: ArchiveSceneProps) {
  const settings = useMemo(() => quality ?? qualityFor("low", 1), [quality]);
  const { phase, progress } = useCinematicTimeline(onDone);
  useArchiveEnvironment();
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const lookAt = useRef(new THREE.Vector3(0, 0.05, 0));
  const keyLightRef = useRef<THREE.SpotLight>(null);
  const shelfLightRef = useRef<THREE.PointLight>(null);
  const wood = useMemo(() => createWoodMaterial(), []);
  const slotWorld = useMemo(() => getSlotWorldCenter(), []);
  const size = useThree((state) => state.size);
  const aspect = size.width / size.height;
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const filled = isShelvedPhase(phase);

  /*
    棚側の接地影を出し始める境目（収納の 0.75）。
    段の途中で1回だけ変わるものは、その1回のためだけに状態を持つ。
    段が進んだ後は境目を見ない
  */
  const [shelvingPastShadow, setShelvingPastShadow] = useState(false);
  const showShelfShadow = filled && (phase === "shelving" ? shelvingPastShadow : true);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers = SOUND_CUES.map((cue) => {
      const at = phaseTimeMs(cue.phase, cue.at);
      return setTimeout(() => {
        // まだ鳴らせない状態なら、その合図は鳴らさずに過ぎる。
        // 途中で音を入にしたときに、以降の合図がそのまま鳴るようにする
        if (!soundRef.current || !isAudioReady()) return;
        // 溜まったタイマーがまとめて発火したとき、演出の時刻から離れた合図は
        // 鳴らさずに捨てる。鳴らす時点の音声時計に載るため、重ねると束になる
        if (!shouldPlaySoundCue(at, progress.elapsed())) return;
        SOUND_PLAYERS[cue.key]();
      }, at);
    });
    return () => timers.forEach(clearTimeout);
  }, [progress]);

  useFrame(({ clock }, delta) => {
    const cam = camRef.current;
    if (!cam) return;

    const phaseProgress = progress.value();
    const shelfGlow = shelfGlowAt(phase, phaseProgress);

    if (phase === "shelving") {
      const past = shelfTAt(phase, phaseProgress) > 0.75;
      if (past !== shelvingPastShadow) setShelvingPastShadow(past);
    }

    const key = CAMERA_KEYS[phase];
    const targetPos = key.pos.clone();
    const targetLook = key.target.clone();

    if (phase === "spine") {
      // 縦長の画面では、書いた位置のままだと表紙が画面を覆う。
      // 向きは変えず、背表紙が入るところまで下がる
      const offset = targetPos.clone().sub(targetLook);
      targetPos.copy(
        targetLook
          .clone()
          .add(
            offset.setLength(spineCameraDistance(aspect, offset.length()))
          )
      );
    }

    if (phase === "shelving") {
      const follow = easeInOut(Math.min(1, phaseProgress * 1.15));
      const bookFocus = new THREE.Vector3(
        THREE.MathUtils.lerp(0, slotWorld.x, follow),
        THREE.MathUtils.lerp(0.02, slotWorld.y + 0.08, follow),
        THREE.MathUtils.lerp(0, slotWorld.z, follow)
      );
      targetLook.lerp(bookFocus, 0.55 + follow * 0.35);
      targetPos.y -= follow * 0.08;
      targetPos.z -= follow * 0.12;
    }

    if (phase === "afterglow" || phase === "done") {
      targetLook.set(slotWorld.x, slotWorld.y + 0.06, slotWorld.z + 0.02);
    }

    const lerp = Math.min(1, delta * (phase === "afterglow" ? 1.6 : 2.4));
    cam.position.lerp(targetPos, lerp);
    lookAt.current.lerp(targetLook, lerp);

    const closeImpact = phase === "closing" ? impactPulse(phaseProgress) : 0;
    if (closeImpact > 0) {
      cam.position.y += Math.sin(clock.elapsedTime * 55) * 0.005 * closeImpact;
      cam.position.z += 0.012 * closeImpact;
    }

    cam.lookAt(lookAt.current);

    if (keyLightRef.current) {
      keyLightRef.current.intensity =
        2.05 +
        (phase === "closing" ? impactPulse(phaseProgress) * 0.28 : 0) +
        // 背表紙は主光源から斜めを向くため、この段だけ少し足して
        // 革と金の起伏が残るようにする
        (phase === "spine" ? 0.75 : 0) +
        shelfGlow * 0.18;

      /*
        背表紙を見せる段では、本が回って背表紙が右手前へ出る。
        そこは既定の光の輪（angle 0.42）の外側で、強さを足しても届かない。
        輪の側を広げる。切り替えはカメラが動いている間に少しずつ行う
      */
      keyLightRef.current.angle = THREE.MathUtils.lerp(
        keyLightRef.current.angle,
        phase === "spine" ? 0.62 : 0.42,
        Math.min(1, delta * 3)
      );
    }
    if (shelfLightRef.current) {
      // 棚の灯りは、収まった本を隣の本より少しだけ明るく見せるためのもの。
      // 背表紙のすぐ手前（0.35）に置いてあるので、強くすると革の色が飛んで
      // 白っぽい板になる
      shelfLightRef.current.intensity = 0.1 + shelfGlow * 0.4;
    }
  });

  const bookSparkles = phase === "writing";
  /*
    背表紙のにじみは、余韻の段では最後の一瞬まで 0.15 を上回り、
    その後の段では 0.35 で一定になる。段だけで決まる
  */
  const shelfSparkles = phase === "afterglow" || phase === "done";

  const particles = (base: number) =>
    Math.max(4, Math.round(base * settings.particleScale));

  return (
    <>
      <color attach="background" args={["#1a1510"]} />
      {/*
        霧は奥行きを出すためのもの。被写界深度（DOF）は入れない。
        深度を取り直して2回ぼかす処理を毎フレーム全画面に掛けることになり、
        スマートフォンでの発熱を上げずに入れる方法が無い。
        代わりに、霧の立ち上がりを手前へ寄せて、棚の奥だけを沈ませる。
      */}
      <fog attach="fog" args={["#1a1510", 3.6, 8.6]} />

      <PerspectiveCamera
        ref={camRef}
        makeDefault
        position={[0.08, 0.22, 2.05]}
        fov={40}
        near={0.1}
        far={20}
      />

      <ambientLight intensity={0.26} color="#c9a878" />
      <hemisphereLight args={["#c9a878", "#1a1510", 0.34]} />
      <spotLight
        ref={keyLightRef}
        position={[1.15, 2.65, 2.05]}
        angle={0.42}
        penumbra={0.65}
        intensity={2.05}
        color="#ffd89a"
        castShadow
        shadow-mapSize={[settings.shadowMapSize, settings.shadowMapSize]}
      />
      <pointLight position={[-1.4, 1.15, 0.95]} intensity={0.3} color="#c9a227" />
      <pointLight position={[0, -0.45, 1.45]} intensity={0.18} color="#8b6914" />
      <pointLight
        ref={shelfLightRef}
        position={[slotWorld.x, slotWorld.y + 0.12, slotWorld.z + 0.35]}
        intensity={0.12}
        color="#d4af37"
        distance={2.2}
      />

      <mesh position={[0, -0.55, 0]} receiveShadow>
        <boxGeometry args={[5.5, 0.12, 2.8]} />
        <primitive object={wood} attach="material" />
      </mesh>

      <ContactShadows
        position={[0, -0.48, 0]}
        opacity={0.52}
        scale={8}
        blur={2.6}
        far={4}
        resolution={settings.contactShadowResolution}
        color="#000000"
      />

      {/*
        棚側の接地影は、本が収まりかけてから初めて要る。
        ContactShadows は置いてあるだけで毎フレーム影用の描画を1回増やすので、
        透明度0のまま置きっぱなしにせず、要る間だけ出す。
      */}
      {showShelfShadow && (
        <ContactShadows
          position={[slotWorld.x, slotWorld.y - 0.34, slotWorld.z]}
          opacity={0.38}
          scale={0.55}
          blur={2.2}
          far={0.8}
          resolution={Math.round(settings.contactShadowResolution / 2)}
          color="#000000"
        />
      )}

      <group position={[0, -0.05, 0]}>
        <AntiqueBook
          phase={phase}
          progress={progress}
          lines={lines}
          heading={heading}
        />
      </group>

      <Bookshelf phase={phase} progress={progress} />

      <SparkleParticles
        active={bookSparkles}
        count={particles(10)}
        position={[0, 0.1, 0.22]}
        spread={[1.1, 0.7, 0.5]}
      />
      <SparkleParticles
        active={shelfSparkles}
        count={particles(12)}
        position={[slotWorld.x, slotWorld.y + 0.15, slotWorld.z + 0.08]}
        spread={[0.35, 0.45, 0.22]}
      />

      {settings.glow && (
        <>
          {/* 卓上ランプのにじみ。ずっと薄く出しておく */}
          <GlowSprite
            position={[0.95, 1.35, 0.9]}
            intensity={() => 0.3 + shelfGlowAt(phase, progress.value()) * 0.1}
            size={2.4}
            color="#ffcf8a"
          />
          {/* 閉じた瞬間の金の照り返し */}
          <GlowSprite
            position={[0, -0.02, 0.42]}
            intensity={() =>
              phase === "closing" ? impactPulse(progress.value()) * 0.55 : 0
            }
            size={1.5}
            color="#e8bf62"
          />
          {/* 棚に収まったあと、背表紙の金がにじむ */}
          <GlowSprite
            position={[slotWorld.x, slotWorld.y + 0.02, slotWorld.z + 0.24]}
            intensity={() => shelfGlowAt(phase, progress.value()) * 0.42}
            size={0.66}
            color="#d4af37"
          />
        </>
      )}

      <mesh position={[0, 0.5, -2.2]} receiveShadow>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#14100c" roughness={0.95} />
      </mesh>
    </>
  );
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export { TIMELINE };
