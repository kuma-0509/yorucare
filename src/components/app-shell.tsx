"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BuildFooter } from "@/components/layout/build-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { StorageHealthBanner } from "@/components/shared/storage-health-banner";
import { StorageNoticeBanner } from "@/components/shared/storage-notice-banner";
import { ReviewConsentDialog } from "@/components/shared/review-consent-dialog";
import { TodayRecordTab } from "@/components/tabs/today-record-tab";
import { RecordsTab } from "@/components/tabs/records-tab";
import { SelfCareTab } from "@/components/tabs/selfcare-tab";
import { ReflectionTab } from "@/components/tabs/reflection-tab";
import { trackTabViewed } from "@/lib/analytics";
import type { AppTab } from "@/lib/types";

interface NavigateOptions {
  recordDate?: string;
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [recordDate, setRecordDate] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    trackTabViewed(activeTab);
  }, [activeTab]);

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

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const showActionBarPadding = activeTab === "today";

  return (
    <div className="min-h-dvh bg-background">
      <main
        className={`mx-auto max-w-lg px-4 pt-6 ${showActionBarPadding ? "pb-page" : "pb-nav pb-safe"}`}
      >
        <AppHeader />
        <StorageHealthBanner />
        <StorageNoticeBanner onNavigateTab={handleNavigateTab} />
        {activeTab === "today" && (
          <TodayRecordTab
            initialDate={recordDate}
            onNavigateTab={handleNavigateTab}
            refreshKey={refreshKey}
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
        {activeTab === "reflection" && (
          <ReflectionTab refreshKey={refreshKey} />
        )}
        <BuildFooter />
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== "today") setRecordDate(undefined);
          setActiveTab(tab);
        }}
      />
      <ReviewConsentDialog />
    </div>
  );
}
