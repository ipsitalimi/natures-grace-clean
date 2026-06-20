import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSignOut } from "@/hooks/useSignOut";

import AdminLayout, { AdminScreenName } from "./AdminLayout";
import AdminDashboardScreen from "./AdminDashboardScreen";
import AdminUsersScreen from "./AdminUsersScreen";
import AdminUserDetailScreen from "./AdminUserDetailScreen";
import AdminPractitionersScreen from "./AdminPractitionersScreen";
import AdminAddPractitionerScreen from "./AdminAddPractitionerScreen";
import AdminStoreScreen from "./AdminStoreScreen";
import AdminCommunityScreen from "./AdminCommunityScreen";
import AdminResourcesScreen from "./AdminResourcesScreen";
import AdminSettingsScreen from "./AdminSettingsScreen";
import AdminPromptsScreen from "./AdminPromptsScreen";
import AdminAnalyticsScreen from "./AdminAnalyticsScreen";
import AdminNotificationsScreen from "./AdminNotificationsScreen";
import AdminPromoCodesScreen from "./AdminPromoCodesScreen";
import AdminReviewsScreen from "./AdminReviewsScreen";
import AdminSupportScreen from "./AdminSupportScreen";
import AdminFeaturedScreen from "./AdminFeaturedScreen";
import AdminSellersScreen from "./AdminSellersScreen";
import AdminApplicationsScreen from "./AdminApplicationsScreen";
import AdminLegalScreen from "./AdminLegalScreen";
import AdminPayoutQueueScreen from "./AdminPayoutQueueScreen";
import AdminRefundQueueScreen from "./AdminRefundQueueScreen";
import AdminAuditLogScreen from "./AdminAuditLogScreen";

const ADMIN_NAV_KEY = "admin_nav_state_v1";

type SubScreen =
  | { type: "main" }
  | { type: "userDetail"; userId: string }
  | { type: "addPractitioner" };

type PersistedAdminNav = {
  activeScreen: AdminScreenName;
  subScreen: SubScreen;
};

export default function AdminScreen() {
  const signOut = useSignOut();
  const [activeScreen, setActiveScreen] = useState<AdminScreenName>("Dashboard");
  const [subScreen, setSubScreen] = useState<SubScreen>({ type: "main" });
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ADMIN_NAV_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw) as PersistedAdminNav;
        if (parsed.activeScreen) setActiveScreen(parsed.activeScreen);
        if (parsed.subScreen) setSubScreen(parsed.subScreen);
      } catch {
        // ignore invalid persisted nav
      } finally {
        if (!cancelled) setNavReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!navReady) return;
    const payload: PersistedAdminNav = { activeScreen, subScreen };
    void AsyncStorage.setItem(ADMIN_NAV_KEY, JSON.stringify(payload));
  }, [activeScreen, subScreen, navReady]);

  const handleNavigate = (screen: AdminScreenName) => {
    setActiveScreen(screen);
    setSubScreen({ type: "main" });
  };

  const handleBack = async () => {
    await signOut();
  };

  const handleBackToDashboard = () => {
    setActiveScreen("Dashboard");
    setSubScreen({ type: "main" });
  };

  const handleBackFromUserDetail = () => {
    setActiveScreen("Users");
    setSubScreen({ type: "main" });
  };

  const renderContent = () => {
    if (subScreen.type === "userDetail") {
      return (
        <AdminUserDetailScreen
          userId={subScreen.userId}
          onBack={handleBackFromUserDetail}
        />
      );
    }

    if (subScreen.type === "addPractitioner") {
      return (
        <AdminAddPractitionerScreen
          onBack={handleBackToDashboard}
        />
      );
    }

    switch (activeScreen) {
      case "Dashboard":
        return (
          <AdminDashboardScreen
            onNavigate={handleNavigate}
            onAddPractitioner={() => setSubScreen({ type: "addPractitioner" })}
          />
        );
      case "Users":
        return (
          <AdminUsersScreen
            onViewUser={(userId) => {
              setActiveScreen("Users");
              setSubScreen({ type: "userDetail", userId });
            }}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      case "Applications":
        return <AdminApplicationsScreen onBackToDashboard={handleBackToDashboard} />;
      case "Sellers":
        return <AdminSellersScreen onBackToDashboard={handleBackToDashboard} />;
      case "Practitioners":
        return (
          <AdminPractitionersScreen
            onAddPractitioner={() => setSubScreen({ type: "addPractitioner" })}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      case "Store":
        return <AdminStoreScreen onBackToDashboard={handleBackToDashboard} />;
      case "Featured":
        return <AdminFeaturedScreen onBackToDashboard={handleBackToDashboard} />;
      case "Community":
        return <AdminCommunityScreen onBackToDashboard={handleBackToDashboard} />;
      case "Resources":
        return <AdminResourcesScreen onBackToDashboard={handleBackToDashboard} />;
      case "Prompts":
        return <AdminPromptsScreen onBackToDashboard={handleBackToDashboard} />;
      case "Analytics":
        return <AdminAnalyticsScreen onBackToDashboard={handleBackToDashboard} />;
      case "Notifications":
        return <AdminNotificationsScreen onBackToDashboard={handleBackToDashboard} />;
      case "PromoCodes":
        return <AdminPromoCodesScreen onBackToDashboard={handleBackToDashboard} />;
      case "Reviews":
        return <AdminReviewsScreen onBackToDashboard={handleBackToDashboard} />;
      case "Support":
        return <AdminSupportScreen onBackToDashboard={handleBackToDashboard} />;
      case "Payouts":
        return <AdminPayoutQueueScreen onBackToDashboard={handleBackToDashboard} />;
      case "Refunds":
        return <AdminRefundQueueScreen onBackToDashboard={handleBackToDashboard} />;
      case "AuditLog":
        return <AdminAuditLogScreen onBackToDashboard={handleBackToDashboard} />;
      case "Legal":
        return <AdminLegalScreen onBackToDashboard={handleBackToDashboard} />;
      case "Settings":
        return <AdminSettingsScreen onBackToDashboard={handleBackToDashboard} />;
      default:
        return <AdminDashboardScreen />;
    }
  };

  return (
    <AdminLayout
      activeScreen={activeScreen}
      onNavigate={handleNavigate}
      onBack={handleBack}
    >
      {renderContent()}
    </AdminLayout>
  );
}
