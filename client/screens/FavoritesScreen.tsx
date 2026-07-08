import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDataContext } from "@/context/DataContext";
import { useFavorites } from "@/context/FavoritesContext";
import type { FavoriteListEntry } from "@/data/favorites";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function FavoriteCard({
  item,
  onRemove,
  onOpen,
  openLabel,
}: {
  item: FavoriteListEntry;
  onRemove: () => void;
  onOpen?: () => void;
  openLabel?: string;
}) {
  return (
    <Card testID={`favorite-card-${item.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <ThemedText style={styles.name}>{item.name}</ThemedText>
          <ThemedText style={styles.specialty}>{item.specialty}</ThemedText>
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          testID={`button-remove-favorite-${item.id}`}
        >
          <Feather name="heart" size={20} color="#D4534A" />
        </Pressable>
      </View>
      {onOpen && openLabel ? (
        <Pressable
          style={styles.viewButton}
          onPress={onOpen}
          testID={`button-open-favorite-${item.itemId}`}
        >
          <ThemedText style={styles.viewButtonText}>{openLabel}</ThemedText>
        </Pressable>
      ) : null}
    </Card>
  );
}

export default function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { session } = useAuth();
  const { practitionerCategories, allProducts, resources, events } = useDataContext();
  const {
    favorites,
    favoritesLoading,
    favoritesError,
    removeFavorite,
    refreshFavorites,
  } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFavorites({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [refreshFavorites]);

  const listEntries = useMemo((): FavoriteListEntry[] => {
    return favorites.map((f) => {
      if (f.itemType === "practitioner") {
        const practitioner = practitionerCategories
          .flatMap((c) => c.practitioners)
          .find((p) => p.id === f.itemId);
        return {
          id: f.id,
          itemType: f.itemType,
          itemId: f.itemId,
          name: practitioner?.name ?? f.displayName,
          specialty:
            practitioner?.subcategory ||
            practitioner?.category ||
            f.displaySubtitle ||
            "Practitioner",
        };
      }
      if (f.itemType === "product") {
        const product = allProducts.find((p) => p.id === f.itemId);
        return {
          id: f.id,
          itemType: f.itemType,
          itemId: f.itemId,
          name: product?.name ?? f.displayName,
          specialty: product?.category ?? f.displaySubtitle ?? "Product",
        };
      }
      if (f.itemType === "resource") {
        const resource = resources.find((r) => r.id === f.itemId);
        return {
          id: f.id,
          itemType: f.itemType,
          itemId: f.itemId,
          name: resource?.title ?? f.displayName,
          specialty: resource?.section ?? f.displaySubtitle ?? "Resource",
        };
      }
      if (f.itemType === "event") {
        const event = events.find((e) => e.id === f.itemId);
        return {
          id: f.id,
          itemType: f.itemType,
          itemId: f.itemId,
          name: event?.title ?? f.displayName,
          specialty: event?.date ?? f.displaySubtitle ?? "Event",
        };
      }
      return {
        id: f.id,
        itemType: f.itemType,
        itemId: f.itemId,
        name: f.displayName,
        specialty: f.displaySubtitle,
      };
    });
  }, [favorites, practitionerCategories, allProducts, resources, events]);

  const handleOpenFavorite = (item: FavoriteListEntry) => {
    switch (item.itemType) {
      case "practitioner":
        navigation.navigate("Main", {
          screen: "WellnessTab",
          params: {
            screen: "PractitionerProfile",
            params: { practitionerId: item.itemId },
          },
        } as never);
        break;
      case "product":
        navigation.navigate("StoreProductDetail", { productId: item.itemId });
        break;
      case "resource":
        navigation.navigate("ResourceDetail", { resourceId: item.itemId });
        break;
      case "event":
        navigation.navigate("Main", {
          screen: "CommunityTab",
          params: {
            screen: "EventDetail",
            params: { eventId: item.itemId },
          },
        } as never);
        break;
    }
  };

  const openLabelFor = (itemType: FavoriteListEntry["itemType"]) => {
    switch (itemType) {
      case "practitioner":
        return "View Profile";
      case "product":
        return "View Product";
      case "resource":
        return "View Resource";
      case "event":
        return "View Event";
    }
  };

  const handleRemove = async (favoriteId: string) => {
    const ok = await removeFavorite(favoriteId);
    if (!ok) {
      await refreshFavorites();
    }
  };

  return (
    <PageLayout
      title="Favorites"
      titleInHeader
      header="back"
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={Colors.light.accent}
          />
        ),
      }}
      contentContainerStyle={styles.content}
    >
      {favoritesLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Loading favorites…</ThemedText>
        </View>
      ) : null}

      {favoritesError ? (
        <ThemedText style={styles.errorText}>{favoritesError}</ThemedText>
      ) : null}

      {!session?.user && isSupabaseConfigured() ? (
        <ThemedText style={styles.errorText}>Sign in to view and save favorites.</ThemedText>
      ) : null}

      {!favoritesLoading && !favoritesError && listEntries.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          {session?.user
            ? "No favorites yet. Tap the heart on a practitioner, product, resource, or event to save it here."
            : "Sign in to save favorites."}
        </ThemedText>
      ) : null}

      {listEntries.map((item) => (
        <FavoriteCard
          key={item.id}
          item={item}
          onRemove={() => handleRemove(item.id)}
          onOpen={() => handleOpenFavorite(item)}
          openLabel={openLabelFor(item.itemType)}
        />
      ))}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: LayoutSpacing.sm,
    paddingTop: LayoutSpacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: LayoutSpacing.md,
  },
  cardInfo: {
    flex: 1,
    marginRight: LayoutSpacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  specialty: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  viewButton: {
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
  },
});
