import { z } from "zod";
import { DEVICE_ID_PATTERN, MAX_SNAPSHOT_BYTES } from "./cloud-backup";

/**
 * 端末とAPIの間でやり取りする形。所有者IDは受け取らない。
 * 誰のデータかは、APIが検証済みセッションからだけ決める。
 */

const uploadSchema = z.object({
  deviceId: z.string().regex(DEVICE_ID_PATTERN),
  /** 端末が作ったバックアップJSONそのもの。文字列のまま照合してから預かる */
  payloadText: z.string().min(2).max(MAX_SNAPSHOT_BYTES),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
});

export type SnapshotUploadPayload = z.infer<typeof uploadSchema>;

export function parseSnapshotUploadPayload(
  input: unknown
): { ok: true; value: SnapshotUploadPayload } | { ok: false } {
  const parsed = uploadSchema.safeParse(input);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false };
}

const deviceSchema = z.object({
  deviceId: z.string().regex(DEVICE_ID_PATTERN),
});

export type DeviceClaimPayload = z.infer<typeof deviceSchema>;

export function parseDeviceClaimPayload(
  input: unknown
): { ok: true; value: DeviceClaimPayload } | { ok: false } {
  const parsed = deviceSchema.safeParse(input);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false };
}
