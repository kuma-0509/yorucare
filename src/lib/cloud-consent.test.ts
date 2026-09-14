// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  getAnalyticsConsent,
  saveAnalyticsConsent,
} from "./analytics-consent";
import {
  getCloudBackupConsent,
  hasCloudBackupConsent,
  saveCloudBackupConsent,
} from "./cloud-consent";

describe("クラウド保存の同意", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("まだ決めていないあいだは預けない", () => {
    expect(getCloudBackupConsent()).toBe("unset");
    expect(hasCloudBackupConsent()).toBe(false);
  });

  it("同意すると預ける、やめると預けない", () => {
    saveCloudBackupConsent(true);
    expect(getCloudBackupConsent()).toBe("granted");
    expect(hasCloudBackupConsent()).toBe(true);

    saveCloudBackupConsent(false);
    expect(getCloudBackupConsent()).toBe("denied");
    expect(hasCloudBackupConsent()).toBe(false);
  });

  it("読めない値が入っていても預けない", () => {
    localStorage.setItem("yorucare_cloud_backup_consent", "たぶん");
    expect(getCloudBackupConsent()).toBe("unset");
    expect(hasCloudBackupConsent()).toBe(false);
  });

  describe("匿名分析の同意とは別に持つ", () => {
    it("クラウド保存をONにしても匿名分析は変わらない", () => {
      saveAnalyticsConsent(false);
      saveCloudBackupConsent(true);
      expect(getAnalyticsConsent()).toBe("denied");
    });

    it("匿名分析をONにしてもクラウド保存は変わらない", () => {
      saveCloudBackupConsent(false);
      saveAnalyticsConsent(true);
      expect(getCloudBackupConsent()).toBe("denied");
    });

    it("片方だけ決めても、もう片方は「まだ決めていない」のまま", () => {
      saveCloudBackupConsent(true);
      expect(getAnalyticsConsent()).toBe("unset");

      localStorage.clear();
      saveAnalyticsConsent(true);
      expect(getCloudBackupConsent()).toBe("unset");
    });
  });
});
