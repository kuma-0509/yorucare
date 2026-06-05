"use client";

import { useCallback, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BuildFooter } from "@/components/layout/build-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { StorageNoticeBanner } from "@/components/shared/storage-notice-banner";
import { TodayRecordTab } from "@/components/tabs/today-record-tab";
import { RecordsTab } from "@/components/tabs/records-tab";
import { SelfCareTab } from "@/components/tabs/selfcare-tab";
import { ReflectionTab } from "@/components/tabs/reflection-tab";
import type { AppTab } from "@/lib/types";

interface NavigateOptions {
  recordDate?: string;
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [recordDate, setRecordDate] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-lg px-4 pt-6 pb-28">
        <AppHeader />
        <StorageNoticeBanner />
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
        {activeTab === "reflection" && <ReflectionTab />}
        <BuildFooter />
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== "today") setRecordDate(undefined);
          setActiveTab(tab);
        }}
      />
    </div>
  );
}
