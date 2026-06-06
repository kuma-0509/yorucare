import { useEffect } from "react";

const SCROLL_PADDING_PX = 20;
const SCROLL_RETRY_DELAYS_MS = [100, 300, 500];

function isMobileTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/** テキストエリアは見出しごと見えるよう、親カードをスクロール対象にする */
export function resolveKeyboardScrollTarget(element: HTMLElement): HTMLElement {
  if (element.tagName === "TEXTAREA") {
    const card = element.closest<HTMLElement>(".rounded-2xl.border");
    if (card) return card;
  }
  return element;
}

function getVisibleViewportTop(): number {
  return window.visualViewport?.offsetTop ?? 0;
}

function getVisibleViewportBottom(): number {
  const vv = window.visualViewport;
  if (vv) return vv.offsetTop + vv.height;
  return window.innerHeight;
}

function scrollIntoVisibleArea(
  scrollTarget: HTMLElement,
  focusedElement: HTMLElement
): void {
  const visibleTop = getVisibleViewportTop();
  const visibleBottom = getVisibleViewportBottom();
  const targetRect = scrollTarget.getBoundingClientRect();
  const focusedRect = focusedElement.getBoundingClientRect();

  if (focusedRect.bottom > visibleBottom - SCROLL_PADDING_PX) {
    window.scrollBy({
      top: focusedRect.bottom - (visibleBottom - SCROLL_PADDING_PX),
      behavior: "smooth",
    });
    return;
  }

  if (targetRect.top < visibleTop + SCROLL_PADDING_PX) {
    window.scrollBy({
      top: targetRect.top - (visibleTop + SCROLL_PADDING_PX),
      behavior: "smooth",
    });
  }
}

/** 入力欄フォーカス時、キーボードに隠れない位置へスクロールする */
export function scrollIntoViewOnKeyboardFocus(element: HTMLElement): void {
  if (!isMobileTouchDevice()) return;

  const scrollTarget = resolveKeyboardScrollTarget(element);

  const runScroll = () => {
    if (document.activeElement !== element) return;
    scrollIntoVisibleArea(scrollTarget, element);
  };

  requestAnimationFrame(() => {
    scrollTarget.scrollIntoView({ block: "nearest", behavior: "auto" });
  });

  for (const delay of SCROLL_RETRY_DELAYS_MS) {
    window.setTimeout(runScroll, delay);
  }

  const vv = window.visualViewport;
  if (!vv) return;

  const onViewportChange = () => {
    if (document.activeElement !== element) {
      cleanup();
      return;
    }
    scrollIntoVisibleArea(scrollTarget, element);
  };

  const cleanup = () => {
    vv.removeEventListener("resize", onViewportChange);
    vv.removeEventListener("scroll", onViewportChange);
  };

  vv.addEventListener("resize", onViewportChange);
  vv.addEventListener("scroll", onViewportChange);
  window.setTimeout(cleanup, 2000);
}

/** キーボード表示中にフォーム下部へ余白を確保し、末尾の入力欄までスクロールできるようにする */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${inset}px`
      );
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.style.setProperty("--keyboard-inset", "0px");
    };
  }, []);
}
