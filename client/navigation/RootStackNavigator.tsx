import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { LegalDocumentKey } from "@/types/legal";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ModalScreen from "@/screens/ModalScreen";
import PlaceholderScreen from "@/screens/PlaceholderScreen";
import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignupScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SessionHistoryScreen from "@/screens/SessionHistoryScreen";
import OrderHistoryScreen from "@/screens/OrderHistoryScreen";
import OrderDetailScreen from "@/screens/OrderDetailScreen";
import SessionDetailScreen from "@/screens/SessionDetailScreen";
import ResourcesScreen from "@/screens/ResourcesScreen";
import ResourceDetailScreen from "@/screens/ResourceDetailScreen";
import NGStoreScreen from "@/screens/NGStoreScreen";
import StoreProductDetailScreen from "@/screens/StoreProductDetailScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import ChangePasswordScreen from "@/screens/ChangePasswordScreen";
import MyReviewsScreen from "@/screens/MyReviewsScreen";
import FavoritesScreen from "@/screens/FavoritesScreen";
import PaymentMethodsScreen from "@/screens/PaymentMethodsScreen";
import HelpScreen from "@/screens/HelpScreen";
import ContactScreen from "@/screens/ContactScreen";
import AboutScreen from "@/screens/AboutScreen";
import LegalDocumentScreen from "@/screens/LegalDocumentScreen";
import SignupLegalScreen from "@/screens/SignupLegalScreen";
import VerifyEmailScreen from "@/screens/VerifyEmailScreen";
import AuthCallbackScreen from "@/screens/AuthCallbackScreen";
import LegalReacceptanceScreen from "@/screens/LegalReacceptanceScreen";
import UserLegalSettingsScreen from "@/screens/UserLegalSettingsScreen";
import SupportScreen from "@/screens/SupportScreen";
import AdminScreen from "@/screens/admin/AdminScreen";
import PractitionerTabNavigator from "@/navigation/PractitionerTabNavigator";
import PractitionerSessionDetailScreen from "@/screens/practitioner/PractitionerSessionDetailScreen";
import PractitionerProfileScreen from "@/screens/practitioner/PractitionerProfileScreen";
import SessionOfferingsScreen from "@/screens/practitioner/SessionOfferingsScreen";
import AddEditOfferingScreen from "@/screens/practitioner/AddEditOfferingScreen";
import PractitionerWalletScreen from "@/screens/practitioner/PractitionerWalletScreen";
import PractitionerAnalyticsScreen from "@/screens/practitioner/PractitionerAnalyticsScreen";
import PractitionerReviewsScreen from "@/screens/practitioner/PractitionerReviewsScreen";
import SellerTabNavigator from "@/navigation/SellerTabNavigator";
import SellerProductDetailScreen from "@/screens/seller/SellerProductDetailScreen";
import ProductListingsScreen from "@/screens/seller/ProductListingsScreen";
import AddEditProductListingScreen from "@/screens/seller/AddEditProductListingScreen";
import SellerOrdersScreen from "@/screens/seller/SellerOrdersScreen";
import SellerAnalyticsScreen from "@/screens/seller/SellerAnalyticsScreen";
import SellerWalletScreen from "@/screens/seller/SellerWalletScreen";
import SellerPromotionsScreen from "@/screens/seller/SellerPromotionsScreen";
import SellerReviewsScreen from "@/screens/seller/SellerReviewsScreen";
import SellerStoreCustomizationScreen from "@/screens/seller/SellerStoreCustomizationScreen";
import SellerDeliverySettingsScreen from "@/screens/seller/SellerDeliverySettingsScreen";
import SellerOnboardingScreen from "@/screens/seller/SellerOnboardingScreen";
import PractitionerOnboardingScreen from "@/screens/practitioner/PractitionerOnboardingScreen";
import KnowYourAdminScreen from "@/screens/KnowYourAdminScreen";
import FirebaseDebugScreen from "@/screens/FirebaseDebugScreen";
import NGBuddyScreen from "@/screens/NGBuddyScreen";
import TrustSafetyScreen from "@/screens/TrustSafetyScreen";
import ApplicationStatusScreen from "@/screens/ApplicationStatusScreen";
import NotificationPreferencesScreen from "@/screens/NotificationPreferencesScreen";
import RefundRequestScreen from "@/screens/RefundRequestScreen";
import CartScreen from "@/screens/CartScreen";
import OrderConfirmationScreen from "@/screens/OrderConfirmationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { withRequireRole } from "@/components/RequireRole";

const GuardedAdminDashboard = withRequireRole(AdminScreen, "Admin");
const GuardedPractitionerMain = withRequireRole(PractitionerTabNavigator, "Practitioner");
const GuardedSellerMain = withRequireRole(SellerTabNavigator, "Seller");
const GuardedPractitionerSessionDetail = withRequireRole(PractitionerSessionDetailScreen, "Practitioner");
const GuardedPractitionerProfile = withRequireRole(PractitionerProfileScreen, "Practitioner");
const GuardedSessionOfferings = withRequireRole(SessionOfferingsScreen, "Practitioner");
const GuardedAddEditOffering = withRequireRole(AddEditOfferingScreen, "Practitioner");
const GuardedPractitionerWallet = withRequireRole(PractitionerWalletScreen, "Practitioner");
const GuardedPractitionerAnalytics = withRequireRole(PractitionerAnalyticsScreen, "Practitioner");
const GuardedPractitionerReviews = withRequireRole(PractitionerReviewsScreen, "Practitioner");
const GuardedSellerProductDetail = withRequireRole(SellerProductDetailScreen, "Seller");
const GuardedProductListings = withRequireRole(ProductListingsScreen, "Seller");
const GuardedAddEditProductListing = withRequireRole(AddEditProductListingScreen, "Seller");
const GuardedSellerOrders = withRequireRole(SellerOrdersScreen, "Seller");
const GuardedSellerAnalytics = withRequireRole(SellerAnalyticsScreen, "Seller");
const GuardedSellerWallet = withRequireRole(SellerWalletScreen, "Seller");
const GuardedSellerPromotions = withRequireRole(SellerPromotionsScreen, "Seller");
const GuardedSellerReviews = withRequireRole(SellerReviewsScreen, "Seller");
const GuardedSellerStoreCustomization = withRequireRole(SellerStoreCustomizationScreen, "Seller");
const GuardedSellerDeliverySettings = withRequireRole(SellerDeliverySettingsScreen, "Seller");
const GuardedSellerOnboarding = withRequireRole(SellerOnboardingScreen, "Seller");
const GuardedPractitionerOnboarding = withRequireRole(PractitionerOnboardingScreen, "Practitioner");

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  SignupLegal: { name: string; email: string; password: string };
  VerifyEmail: { email: string };
  AuthCallback: undefined;
  LegalReacceptance: undefined;
  ForgotPassword: undefined;
  Main: undefined;
  Notifications: undefined;
  Settings: undefined;
  SessionHistory: undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  SessionDetail: { sessionId: string };
  Resources: undefined;
  ResourceDetail: { resourceId: string };
  NGStore: undefined;
  StoreProductDetail: { productId: string };
  Cart: undefined;
  OrderConfirmation: {
    orderNumber: string;
    deliveryOption: string;
    totalPrice: number;
    items: {
      productId: string;
      productName: string;
      productCategory: string;
      quantity: number;
      unitPrice: number;
    }[];
  };
  EditProfile: undefined;
  ChangePassword: undefined;
  MyReviews: undefined;
  Favorites: undefined;
  PaymentMethods: undefined;
  Help: undefined;
  Contact: undefined;
  About: undefined;
  LegalDocument: { docKey: LegalDocumentKey };
  UserLegalPolicies: undefined;
  TrustSafety: undefined;
  ApplicationStatus: undefined;
  NotificationPreferences: undefined;
  RefundRequest: { orderId?: string; bookingId?: string };
  Support: undefined;
  AdminDashboard: undefined;
  PractitionerMain: undefined;
  PractitionerSessionDetail: { sessionId: string };
  PractitionerProfile: undefined;
  SessionOfferings: undefined;
  AddEditOffering: { offeringId: string | null };
  PractitionerWallet: undefined;
  PractitionerAnalytics: undefined;
  PractitionerReviews: undefined;
  SellerMain: undefined;
  SellerOnboarding: undefined;
  PractitionerOnboarding: undefined;
  SellerProductDetail: { productId: string };
  ProductListings: undefined;
  AddEditProductListing: { listingId?: string | null; prefill?: any };
  SellerOrders: undefined;
  SellerAnalytics: undefined;
  SellerWallet: undefined;
  SellerPromotions: undefined;
  SellerReviews: undefined;
  SellerStoreCustomization: undefined;
  SellerDeliverySettings: undefined;
  KnowYourAdmin: undefined;
  FirebaseDebug: undefined;
  NGBuddy: undefined;
  Modal: undefined;
  Placeholder: { title: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignupLegal"
        component={SignupLegalScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="AuthCallback"
        component={AuthCallbackScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="LegalReacceptance"
        component={LegalReacceptanceScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessionHistory"
        component={SessionHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Resources"
        component={ResourcesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResourceDetail"
        component={ResourceDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NGStore"
        component={NGStoreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StoreProductDetail"
        component={StoreProductDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderConfirmation"
        component={OrderConfirmationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Contact"
        component={ContactScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserLegalPolicies"
        component={UserLegalSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrustSafety"
        component={TrustSafetyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ApplicationStatus"
        component={ApplicationStatusScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RefundRequest"
        component={RefundRequestScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Modal"
        component={ModalScreen}
        options={{
          presentation: "modal",
          headerTitle: "Modal",
        }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={GuardedAdminDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerMain"
        component={GuardedPractitionerMain}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerOnboarding"
        component={GuardedPractitionerOnboarding}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="PractitionerSessionDetail"
        component={GuardedPractitionerSessionDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerProfile"
        component={GuardedPractitionerProfile}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessionOfferings"
        component={GuardedSessionOfferings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEditOffering"
        component={GuardedAddEditOffering}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerWallet"
        component={GuardedPractitionerWallet}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerAnalytics"
        component={GuardedPractitionerAnalytics}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerReviews"
        component={GuardedPractitionerReviews}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerMain"
        component={GuardedSellerMain}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerOnboarding"
        component={GuardedSellerOnboarding}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="SellerProductDetail"
        component={GuardedSellerProductDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductListings"
        component={GuardedProductListings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEditProductListing"
        component={GuardedAddEditProductListing}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerOrders"
        component={GuardedSellerOrders}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerAnalytics"
        component={GuardedSellerAnalytics}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerWallet"
        component={GuardedSellerWallet}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerPromotions"
        component={GuardedSellerPromotions}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerReviews"
        component={GuardedSellerReviews}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerStoreCustomization"
        component={GuardedSellerStoreCustomization}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerDeliverySettings"
        component={GuardedSellerDeliverySettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KnowYourAdmin"
        component={KnowYourAdminScreen}
        options={{ headerShown: false }}
      />
      {__DEV__ ? (
        <Stack.Screen
          name="FirebaseDebug"
          component={FirebaseDebugScreen}
          options={{ headerShown: false }}
        />
      ) : null}
      <Stack.Screen
        name="NGBuddy"
        component={NGBuddyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Placeholder"
        component={PlaceholderScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
