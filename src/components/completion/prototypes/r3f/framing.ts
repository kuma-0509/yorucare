/**
 * 画面の縦横比に合わせて、演出の中で読ませる文字の大きさを決める。
 *
 * この演出のカメラは、書いている本を 2 前後の距離から見る。
 * 透視投影で横に見えている幅は `2 * 距離 * tan(画角/2) * 縦横比` なので、
 * **縦長の画面ほど横は狭くなる。** 画角と距離を据え置いたまま縦長の端末で開くと、
 * 世界座標で幅の決まっている文字が画面の外へはみ出し、行の頭が切れる。
 *
 * カメラを引いて直す方法は採らない。霧（`fog`）の立ち上がりが 3.6 からなので、
 * 行が収まる距離まで引くと本が霧に沈む。ここでは文字の側を縮める。
 */

/** 筆記の段のカメラ距離（`archive-scene.tsx` の writing キー） */
const WRITING_CAMERA_DISTANCE = 2.06;

/** カメラの画角（度）。`archive-canvas.tsx` の PerspectiveCamera と揃える */
const CAMERA_FOV_DEG = 40;

/** 書いた行を入れている要素の幅（px）。`antique-book.tsx` の Html と揃える */
export const PAGE_TEXT_WIDTH_PX = 220;

/** drei の Html が `distanceFactor` から世界座標の大きさを出すときの比 */
const HTML_WORLD_RATIO = 1 / 400;

/** 横長の画面での既定値。これより大きくはしない */
export const PAGE_TEXT_BASE_FACTOR = 1.35;

/** 画面端に残す余白（見えている幅に対する割合） */
const SAFE_RATIO = 0.86;

/**
 * 背表紙を見せる段で、横に入れたい世界座標の幅。
 * 背表紙（`BOOK.t` = 0.5）と、斜めに見えている表紙のぶんを入れる。
 */
export const SPINE_FRAME_WIDTH = 1.45;

/**
 * 背表紙の段でカメラを引ける上限。
 * 霧は 3.6 から立ち上がるので、これ以上引くと本が背景へ沈む。
 */
export const MAX_SPINE_DISTANCE = 4.2;

/**
 * 背表紙の段のカメラ距離。
 *
 * 縦長の画面では、書いてある位置に置いたままだと**本の表紙が画面いっぱいに
 * 広がって、背表紙が見えない**。横長の画面では元の寄りを変えない。
 */
export function spineCameraDistance(
  aspect: number,
  authoredDistance: number,
  fovDeg = CAMERA_FOV_DEG
): number {
  const needed =
    SPINE_FRAME_WIDTH / (2 * Math.tan((fovDeg * Math.PI) / 360) * aspect);
  return Math.min(
    Math.max(authoredDistance, needed),
    Math.max(authoredDistance, MAX_SPINE_DISTANCE)
  );
}

/** カメラから `distance` の位置で、横に見えている世界座標の幅 */
export function visibleWidthAt(
  aspect: number,
  distance = WRITING_CAMERA_DISTANCE,
  fovDeg = CAMERA_FOV_DEG
): number {
  return 2 * distance * Math.tan((fovDeg * Math.PI) / 360) * aspect;
}

/** `distanceFactor` から決まる、書いた行の世界座標での幅 */
export function pageTextWorldWidth(distanceFactor: number): number {
  return PAGE_TEXT_WIDTH_PX * distanceFactor * HTML_WORLD_RATIO;
}

/**
 * 書いた行の `distanceFactor`。
 * 横長の画面では既定値のまま、縦長の画面では見えている幅に収まるところまで下げる。
 */
export function pageTextDistanceFactor(aspect: number): number {
  const fits =
    (visibleWidthAt(aspect) * SAFE_RATIO) /
    (PAGE_TEXT_WIDTH_PX * HTML_WORLD_RATIO);
  return Math.min(PAGE_TEXT_BASE_FACTOR, fits);
}
