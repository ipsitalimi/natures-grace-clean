import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

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

type SubScreen =
  | { type: "main" }
  | { type: "userDetail"; userId: string }
  | { type: "addPractitioner" };

export default function AdminScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [activeScreen, setActiveScreen] = useState<AdminScreenName>("Dashboard");
  const [subScreen, setSubScreen] = useState<SubScreen>({ type: "main" });

  const handleNavigate = (screen: AdminScreenName) => {
    setActiveScreen(screen);
    setSubScreen({ type: "main" });
  };

  const handleBack = () => {
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleBackToDashboard = () => {
    setActiveScreen("Dashboard");
    setSubScreen({ type: "main" });
  };

  const renderContent = () => {
    if (subScreen.type === "userDetail") {
      return (
        <AdminUserDetailScreen
          userId={subScreen.userId}
          onBack={handleBackToDashboard}
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
            onViewUser={(userId) => setSubScreen({ type: "userDetail", userId })}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      case "Practitioners":
        return (
          <AdminPractitionersScreen
            onAddPractitioner={() => setSubScreen({ type: "addPractitioner" })}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      case "Store":
        return <AdminStoreScreen onBackToDashboard={handleBackToDashboard} />;
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
