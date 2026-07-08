import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import ProfileDrawer from "@/components/ProfileDrawer";
import PractitionerDrawer from "@/components/PractitionerDrawer";
import SellerDrawer from "@/components/SellerDrawer";

export type DrawerVariant = "profile" | "practitioner" | "seller";

type DrawerContextType = {
  isOpen: boolean;
  variant: DrawerVariant | null;
  openDrawer: (variant: DrawerVariant) => void;
  openDrawerForRole: (options: { isSeller?: boolean; isPractitioner?: boolean }) => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType | null>(null);

type DrawerProviderProps = {
  children: React.ReactNode;
  /** Wired from NavigationContainer.onStateChange to close drawer on route changes. */
  registerNavigationCloseHandler?: (handler: (() => void) | null) => void;
};

export function DrawerProvider({ children, registerNavigationCloseHandler }: DrawerProviderProps) {
  const [variant, setVariant] = useState<DrawerVariant | null>(null);

  const closeDrawer = useCallback(() => {
    setVariant(null);
  }, []);

  const openDrawer = useCallback((next: DrawerVariant) => {
    setVariant(next);
  }, []);

  const openDrawerForRole = useCallback(
    (options: { isSeller?: boolean; isPractitioner?: boolean }) => {
      if (options.isSeller) {
        setVariant("seller");
        return;
      }
      if (options.isPractitioner) {
        setVariant("practitioner");
        return;
      }
      setVariant("profile");
    },
    []
  );

  useEffect(() => {
    registerNavigationCloseHandler?.(closeDrawer);
    return () => registerNavigationCloseHandler?.(null);
  }, [closeDrawer, registerNavigationCloseHandler]);

  const value = useMemo(
    () => ({
      isOpen: variant !== null,
      variant,
      openDrawer,
      openDrawerForRole,
      closeDrawer,
    }),
    [variant, openDrawer, openDrawerForRole, closeDrawer]
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <ProfileDrawer visible={variant === "profile"} onClose={closeDrawer} />
      <PractitionerDrawer visible={variant === "practitioner"} onClose={closeDrawer} />
      <SellerDrawer visible={variant === "seller"} onClose={closeDrawer} />
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextType {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error("useDrawer must be used inside DrawerProvider");
  }
  return ctx;
}
