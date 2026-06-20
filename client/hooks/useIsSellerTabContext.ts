import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";

/** True when the screen is shown inside the seller bottom tab navigator. */
export function useIsSellerTabContext(): boolean {
  const navigation = useNavigation();
  let current: NavigationProp<ParamListBase> | undefined = navigation as NavigationProp<ParamListBase>;

  while (current) {
    const state = current.getState();
    const names = state?.routeNames ?? [];
    if (names.includes("SellerHomeTab")) {
      return true;
    }
    current = current.getParent() as NavigationProp<ParamListBase> | undefined;
  }

  return false;
}
