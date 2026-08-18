import * as THREE from "three";
import { BOOK } from "./materials";

/** 本棚グループ基準のレイアウト定数（bookshelf.tsx と antique-book.tsx で共有） */
export const SHELF_LAYOUT = {
  /** 本棚ルート group.position */
  groupY: -1.55,
  groupZ: 0.05,
  /** 本の列 group */
  rowY: -0.08,
  rowZ: 0.08,
  /** 空きスロット（0-indexed） */
  emptySlotIndex: 3,
  slotSpacing: 0.28,
  /** 収納後の背表紙寸法（棚の他の本と揃える） */
  slotSpineWidth: 0.18,
  slotHeight: 0.68,
  slotDepth: 0.32,
  /** 列内での本中心 Y（他の本 mesh と同じ基準） */
  bookCenterYOffset: -0.01,
} as const;

/**
 * 背表紙のふくらみ（`antique-book.tsx` が本体の左に置く箱）のローカルX方向の張り出し。
 * 棚では奥行きの一部になるので、収まりを見るときは本体の幅だけでは足りない。
 */
export const SPINE_BULGE = BOOK.t;

/** 棚では奥行きへ回る、ローカルX方向の全長 */
const BOOK_DEPTH_LOCAL = BOOK.w + SPINE_BULGE;

export function getSlotRowPosition(): THREE.Vector3 {
  const x =
    (SHELF_LAYOUT.emptySlotIndex - 3) * SHELF_LAYOUT.slotSpacing;
  return new THREE.Vector3(x, SHELF_LAYOUT.bookCenterYOffset, 0);
}

/** ワールド座標での空きスロット中心 */
export function getSlotWorldCenter(): THREE.Vector3 {
  const row = getSlotRowPosition();
  return new THREE.Vector3(
    row.x,
    SHELF_LAYOUT.groupY + SHELF_LAYOUT.rowY + row.y,
    SHELF_LAYOUT.groupZ + SHELF_LAYOUT.rowZ + row.z
  );
}

/** AntiqueBook 親 group（y=-0.05）から見たスロット中心 */
export function getSlotLocalCenter(bookParentY = -0.05): THREE.Vector3 {
  const world = getSlotWorldCenter();
  return new THREE.Vector3(world.x, world.y - bookParentY, world.z);
}

/** 机の上での本の初期位置（AntiqueBook ローカル） */
export const DESK_POSE = {
  position: new THREE.Vector3(0, -0.05, 0),
  rotationY: 0,
  rotationX: 0.04,
  scale: new THREE.Vector3(1, 1, 1),
} as const;

/**
 * 背表紙を見せるために机の上で本を回す角度。
 *
 * 背表紙は本のローカル -X 側にあるので、Y軸まわりに正の向きへ回すと
 * 手前（+Z）側へ来る。**この段のカメラは右手前（方向はおよそ x:z = 0.69:0.72）に
 * あるため、真横（π/2）で止めると表紙の側が正面に来て、背表紙が斜めにしか見えない。**
 * 背表紙がカメラの正面を向く角度まで回し、収納の段で棚姿勢（π/2）へ戻す。
 */
export const SPINE_POSE = {
  rotationY: 2.3,
  rotationX: 0.02,
} as const;

/**
 * 背表紙が手前（+Z）を向き、奥（-Z）へ収まる棚姿勢。
 *
 * Y軸 +90° で、ローカル -X（背表紙）がワールド +Z を向く。
 * 符号を逆にすると小口（ページの断面）が手前を向き、背表紙のラベルは
 * 棚の奥を向いてしまう。
 */
export const SHELF_POSE = {
  rotationY: Math.PI / 2,
  rotationX: 0.06,
} as const;

/**
 * 棚に収めるときの非均一スケール。
 *
 * 棚姿勢では**本のローカルX（幅）が棚の奥行きへ、ローカルZ（厚み）が背表紙の幅へ**回る。
 * 割る辺を取り違えると、背表紙が紙のように薄くなったまま、本が棚の手前へ
 * 大きく飛び出す。`shelvedBookFit()` の表示テストでこの対応を固定する。
 */
export function computeShelfScale(): THREE.Vector3 {
  return new THREE.Vector3(
    SHELF_LAYOUT.slotDepth / BOOK_DEPTH_LOCAL,
    SHELF_LAYOUT.slotHeight / BOOK.h,
    SHELF_LAYOUT.slotSpineWidth / BOOK.t
  );
}

/**
 * 背表紙のふくらみは本体の中心からずれた位置にあるため、
 * ローカル原点をそのままスロット中心へ置くと本が手前へずれる。そのぶんを奥へ戻す。
 */
export function shelvedDepthOffset(): number {
  return -(SPINE_BULGE / 2) * computeShelfScale().x;
}

/** 棚姿勢での本のローカル境界（背表紙のふくらみと表紙の厚みを含む） */
function localBookBox(): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(-(BOOK.w / 2 + SPINE_BULGE), -BOOK.h / 2, -BOOK.t / 2),
    new THREE.Vector3(BOOK.w / 2, BOOK.h / 2, BOOK.t / 2)
  );
}

/**
 * 棚に収まった本の外形（背表紙の幅・高さ・奥行き）。
 *
 * 前傾（`SHELF_POSE.rotationX`）は棚に寄りかかった見え方のためのもので、
 * 収まりの判定には含めない。ここで見たいのは、回転と非均一スケールの
 * 軸の対応が合っているかだけ。
 */
export function shelvedBookFit(): THREE.Vector3 {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, SHELF_POSE.rotationY, 0)
    ),
    computeShelfScale()
  );
  return localBookBox().applyMatrix4(matrix).getSize(new THREE.Vector3());
}

/** 棚姿勢で背表紙が向いているワールド方向 */
export function shelvedSpineDirection(): THREE.Vector3 {
  return new THREE.Vector3(-1, 0, 0).applyEuler(
    new THREE.Euler(SHELF_POSE.rotationX, SHELF_POSE.rotationY, 0)
  );
}
