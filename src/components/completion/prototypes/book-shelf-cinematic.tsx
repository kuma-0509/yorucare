"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { COPY } from "@/lib/copy";
import { prefersReducedMotion } from "@/lib/motion";
import { BookShelfMagic } from "./book-shelf-magic";
import { CinematicVignette } from "./cinematic-vignette";

const ArchiveCanvas = dynamic(
  () => import("./r3f/archive-canvas").then((mod) => mod.ArchiveCanvas),
  { ssr: false, loading: () => <SceneFallback /> }
);

interface BookShelfCinematicProps {
  lines: string[];
  heading?: string;
  title?: string;
  subtitle?: string;
  soundEnabled?: boolean;
  /** 3D版だけが音を持つため、音の操作を出せる状態を親へ伝える */
  onSoundAvailabilityChange?: (available: boolean) => void;
  onDone?: () => void;
}

function SceneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1510]">
      <p className="text-sm text-[#c9a227]/70">書庫を準備しています…</p>
    </div>
  );
}

class R3fErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * React Three Fiber 版「書庫に記録を保管する」シネマティック演出。
 * WebGL 不可・reduced-motion 時は CSS 簡易版へフォールバック。
 */
export function BookShelfCinematic({
  lines,
  heading,
  title = COPY.completion.shelfDone,
  subtitle = COPY.completion.shelfDoneSub,
  soundEnabled = false,
  onSoundAvailabilityChange,
  onDone,
}: BookShelfCinematicProps) {
  const [mode, setMode] = useState<"loading" | "r3f" | "css">("loading");
  const [showMessage, setShowMessage] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setMode("css");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      setMode(gl ? "r3f" : "css");
    } catch {
      setMode("css");
    }
  }, []);

  useEffect(() => {
    onSoundAvailabilityChange?.(mode === "r3f");
  }, [mode, onSoundAvailabilityChange]);

  const handleDone = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setShowMessage(true);
    onDone?.();
  }, [onDone]);

  if (mode === "loading") {
    return <SceneFallback />;
  }

  if (mode === "css") {
    return (
      <BookShelfMagic
        lines={lines}
        heading={heading}
        title={title}
        subtitle={subtitle}
        onDone={handleDone}
      />
    );
  }

  return (
    <R3fErrorBoundary
      onError={() => setMode("css")}
      fallback={
        <BookShelfMagic
          lines={lines}
          heading={heading}
          title={title}
          subtitle={subtitle}
          onDone={handleDone}
        />
      }
    >
      <div className="absolute inset-0 overflow-hidden bg-[#1a1510]">
        <ArchiveCanvas
          lines={lines}
          heading={heading}
          soundEnabled={soundEnabled}
          onDone={handleDone}
        />

        <CinematicVignette />

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-[9%] z-20 flex justify-center px-6 pb-[env(safe-area-inset-bottom)] transition-opacity duration-700 sm:bottom-[6%]",
            showMessage ? "opacity-100" : "opacity-0"
          )}
          aria-live="polite"
        >
          <div className="max-w-sm text-center">
            <p className="text-lg font-medium text-[#f0e6d0] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {title}
            </p>
            {subtitle && (
              <p className="mt-1.5 text-sm leading-relaxed text-[#c9a227]/75 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </R3fErrorBoundary>
  );
}
