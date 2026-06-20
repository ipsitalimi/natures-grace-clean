import React from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import LegalDocumentReader from "@/components/legal/LegalDocumentReader";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "LegalDocument">;

export default function LegalDocumentScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();

  return (
    <LegalDocumentReader
      docKey={route.params.docKey}
      onBack={() => navigation.goBack()}
    />
  );
}
