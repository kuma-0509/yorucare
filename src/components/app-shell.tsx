"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BuildFooter } from "@/components/layout/build-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { StorageHealthBanner } from "@/components/shared/storage-health-banner";
import { StorageNoticeBanner } from "@/components/shared/storage-notice-banner";
import { BackupReminderBanner } from "@/components/shared/backup-reminder-banner";
import { ReviewConsentDialog } from "@/components/shared/review-consent-dialog";
import { repository } from "@/lib/repository";
import { TodayRecordTab } from "@/components/tabs/today-record-tab";
import { RecordsTab } from "@/components/tabs/records-tab";
import { SelfCareTab } from "@/components/tabs/selfcare-tab";
import { ReflectionTab } from "@/components/tabs/reflection-tab";
import { trackTabViewed } from "@/lib/analytics";
import { useKeyboardInset } from "@/lib/keyboard-scroll";
import { resetScrollPosition } from "@/lib/utils";
import type { AppTab } from "@/lib/types";

interface NavigateOptions {
  recordDate?: string;
}

export function AppShell() {
  useKeyboardInset();

  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [recordDate, setRecordDate] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    repository.runStorageMigrations();
  }, []);

  useEffect(() => {
    trackTabViewed(activeTab);
  }, [activeTab]);

  useEffect(() => {
    resetScrollPosition();
    const frame = requestAnimationFrame(() => {
      resetScrollPosition();
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, recordDate]);

  const handleNavigateTab = useCallback(
    (tab: AppTab, options?: NavigateOptions) => {
      if (options?.recordDate) {
        setRecordDate(options.recordDate);
      } else if (tab !== "today") {
        setRecordDate(undefined);
      }
      setActiveTab(tab);
    },
    []
  );

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [todaySavedView, setTodaySavedView] = useState(false);

  const showActionBarPadding = activeTab === "today" && !todaySavedView;
  const mainPaddingBottom = showActionBarPadding ? "pb-page" : "pb-nav pb-safe";

  return (
    <div className="min-h-dvh bg-background">
      <main
        className={`mx-auto max-w-lg px-4 ${todaySavedView ? "pt-4" : "pt-6"} ${mainPaddingBottom}`}
      >
        <AppHeader compact={todaySavedView} />
        <StorageHealthBanner />
        <StorageNoticeBanner onNavigateTab={handleNavigateTab} />
        {!todaySavedView && (
          <BackupReminderBanner
            onNavigateTab={handleNavigateTab}
            refreshKey={refreshKey}
          />
        )}
        {activeTab === "today" && (
          <TodayRecordTab
            initialDate={recordDate}
            onNavigateTab={handleNavigateTab}
            refreshKey={refreshKey}
            onSavedViewChange={setTodaySavedView}
          />
        )}
        {activeTab === "records" && (
          <RecordsTab
            onNavigateTab={handleNavigateTab}
            refreshKey={refreshKey}
            onDataImported={bumpRefresh}
          />
        )}
        {activeTab === "selfcare" && (
          <SelfCareTab onDataChange={bumpRefresh} />
        )}
        {activeTab === "reflection" && <ReflectionTab refreshKey={refreshKey} />}
        {!todaySavedView && <BuildFooter />}
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== "today") {
            setRecordDate(undefined);
            setTodaySavedView(false);
          }
          setActiveTab(tab);
        }}
      />
      <ReviewConsentDialog />
    </div>
  );
}
