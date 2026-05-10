import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ModalScreen from "@/screens/ModalScreen";
import PlaceholderScreen from "@/screens/PlaceholderScreen";
import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignupScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SessionHistoryScreen from "@/screens/SessionHistoryScreen";
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
import SupportScreen from "@/screens/SupportScreen";
import AdminScreen from "@/screens/admin/AdminScreen";
import PractitionerTabNavigator from "@/navigation/PractitionerTabNavigator";
import PractitionerSessionDetailScreen from "@/screens/practitioner/PractitionerSessionDetailScreen";
import PractitionerProfileScreen from "@/screens/practitioner/PractitionerProfileScreen";
import SessionOfferingsScreen from "@/screens/practitioner/SessionOfferingsScreen";
import AddEditOfferingScreen from "@/screens/practitioner/AddEditOfferingScreen";
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
import KnowYourAdminScreen from "@/screens/KnowYourAdminScreen";
import FirebaseDebugScreen from "@/screens/FirebaseDebugScreen";
import NGBuddyScreen from "@/screens/NGBuddyScreen";
import CartScreen from "@/screens/CartScreen";
import OrderConfirmationScreen from "@/screens/OrderConfirmationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Main: undefined;
  Notifications: undefined;
  Settings: undefined;
  SessionHistory: undefined;
  SessionDetail: { sessionId: string };
  Resources: undefined;
  ResourceDetail: { resourceId: string };
  NGStore: undefined;
  StoreProductDetail: { productId: string };
  Cart: undefined;
  OrderConfirmation: {
    deliveryOption: string;
    totalPrice: number;
  };
  EditProfile: undefined;
  ChangePassword: undefined;
  MyReviews: undefined;
  Favorites: undefined;
  PaymentMethods: undefined;
  Help: undefined;
  Contact: undefined;
  About: undefined;
  Support: undefined;
  AdminDashboard: undefined;
  PractitionerMain: undefined;
  PractitionerSessionDetail: { sessionId: string };
  PractitionerProfile: undefined;
  SessionOfferings: undefined;
  AddEditOffering: { offeringId: string | null };
  SellerMain: undefined;
  SellerProductDetail: { productId: string };
  ProductListings: undefined;
  AddEditProductListing: { listingId?: string | null; prefill?: any };
  SellerOrders: undefined;
  SellerAnalytics: undefined;
  SellerWallet: undefined;
  SellerPromotions: undefined;
  SellerReviews: undefined;
  SellerStoreCustomization: undefined;
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
        component={AdminScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerMain"
        component={PractitionerTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerSessionDetail"
        component={PractitionerSessionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PractitionerProfile"
        component={PractitionerProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessionOfferings"
        component={SessionOfferingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEditOffering"
        component={AddEditOfferingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerMain"
        component={SellerTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerProductDetail"
        component={SellerProductDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductListings"
        component={ProductListingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEditProductListing"
        component={AddEditProductListingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerOrders"
        component={SellerOrdersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerAnalytics"
        component={SellerAnalyticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerWallet"
        component={SellerWalletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerPromotions"
        component={SellerPromotionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerReviews"
        component={SellerReviewsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerStoreCustomization"
        component={SellerStoreCustomizationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KnowYourAdmin"
        component={KnowYourAdminScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FirebaseDebug"
        component={FirebaseDebugScreen}
        options={{ headerShown: false }}
      />
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
