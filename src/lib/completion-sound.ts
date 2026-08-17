import { STORAGE_KEYS } from "./constants";

/**
 * 記録完了演出の音を鳴らすかどうかの設定。
 *
 * 決めたこと（2026-08-17）:
 * - **端末内の設定として1つ持つ。毎回選ばせない。** 記録は1日1〜2分で終える前提なので、
 *   締めくくりのたびに音の可否を尋ねると、そのぶん操作が増える。
 * - **既定はOFF。** 夜間や外出先で開くことを想定しており、黙って音が出る状態を初期値にしない。
 *   ブラウザの自動再生ブロックへ当てにいく必要も無くなる。
 * - 保存に失敗する環境（プライベートモード等）では、その回だけOFF相当として扱い、
 *   記録本体の保存には影響させない。
 */

const ON = "on";
const OFF = "off";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** 音を鳴らす設定になっているか。未設定・読み取り不能なら false */
export function isCompletionSoundEnabled(): boolean {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.completionSound) === ON;
  } catch {
    return false;
  }
}

/** 音の設定を保存する。保存できなくても例外は投げない */
export function setCompletionSoundEnabled(enabled: boolean): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.completionSound, enabled ? ON : OFF);
  } catch {
    // 設定を保存できない環境でも、演出と記録は続けられるようにする
  }
}
