"use client";

/**
 * 演出に重ねるビネットと、上からの光のにじみ。
 *
 * どちらも DOM のグラデーション1枚ずつで、3D側の描画には触らない。
 * ポストプロセスのビネットにすると、そのために全画面をもう一度塗ることになる。
 * ブラウザはこの2枚を合成の段で重ねるだけなので、フレームあたりの負担はほぼ増えない。
 * **3D版と平面（CSS）版の両方に同じものを重ね、明るさの落ち方を揃える。**
 */
export function CinematicVignette() {
  return (
    <>
      {/* 四隅を落として、視線を画面中央（本と棚）に留める */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(10,8,6,0.42)_72%,rgba(6,5,4,0.78)_100%)]"
        aria-hidden="true"
      />
      {/* 上からの灯り。書庫のランプがある側をわずかに温める */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[38%] bg-[linear-gradient(to_bottom,rgba(255,216,154,0.10),transparent)]"
        aria-hidden="true"
      />
    </>
  );
}
