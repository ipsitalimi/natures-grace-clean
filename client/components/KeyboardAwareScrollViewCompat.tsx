import React, { forwardRef } from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

const defaultKeyboardDismissMode = Platform.OS === "ios" ? "interactive" : "on-drag";

/**
 * KeyboardAwareScrollView that falls back to ScrollView on web.
 * Use this for any screen containing text inputs.
 */
export const KeyboardAwareScrollViewCompat = forwardRef<ScrollView, Props>(
  function KeyboardAwareScrollViewCompat(
    {
      children,
      keyboardShouldPersistTaps = "handled",
      keyboardDismissMode = defaultKeyboardDismissMode,
      ...props
    },
    ref
  ) {
    if (Platform.OS === "web") {
      return (
        <ScrollView
          ref={ref}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode={keyboardDismissMode}
          {...props}
        >
          {children}
        </ScrollView>
      );
    }

    return (
      <KeyboardAwareScrollView
        ref={ref}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        {...props}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  }
);
