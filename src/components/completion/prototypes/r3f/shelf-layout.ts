import * as THREE from "three";

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

/** 背表紙が手前（+Z）を向き、奥（-Z）へ収まる棚姿勢 */
export const SHELF_POSE = {
  rotationY: -Math.PI / 2,
  rotationX: 0.06,
} as const;
