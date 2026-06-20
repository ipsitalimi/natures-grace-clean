import React from "react";
import { View, Image, StyleSheet, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";
import { getProductImageSource } from "@/data/storeProducts";

type ProductImageSource = {
  id: string;
  imageKey?: string;
  imageUrl?: string | null;
  category?: string;
};

type Props = {
  product: ProductImageSource;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  iconSize?: number;
};

export default function ProductImageView({
  product,
  containerStyle,
  imageStyle,
  iconSize = 28,
}: Props) {
  const source = getProductImageSource(product);

  if (source) {
    return (
      <View style={containerStyle}>
        <Image source={source} style={imageStyle} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.placeholder, containerStyle]}>
      <Feather name="package" size={iconSize} color={Colors.light.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
