import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import NGStoreScreen from "@/screens/NGStoreScreen";
import StoreProductDetailScreen from "@/screens/StoreProductDetailScreen";
import CartScreen from "@/screens/CartScreen";
import OrderConfirmationScreen from "@/screens/OrderConfirmationScreen";
import SellerApplicationScreen from "@/screens/SellerApplicationScreen";

export type StoreStackParamList = {
  StoreMain: undefined;
  StoreProductDetail: { productId: string };
  Cart: undefined;
  OrderConfirmation: {
    deliveryOption: string;
    totalPrice: number;
  };
  SellerApplication: undefined;
};

const Stack = createNativeStackNavigator<StoreStackParamList>();

export default function StoreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StoreMain" component={NGStoreScreen} />
      <Stack.Screen name="StoreProductDetail" component={StoreProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
      <Stack.Screen name="SellerApplication" component={SellerApplicationScreen} />
    </Stack.Navigator>
  );
}
