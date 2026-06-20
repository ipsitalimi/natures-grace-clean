import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export interface BookingDetails {
  practitionerId: string;
  practitionerName: string;
  practitionerPhoto: string;
  category: string;
  date: {
    dayName: string;
    dayNum: number;
    monthName: string;
  };
  time: string;
  duration: number;
}

interface BookingContextType {
  upcomingBooking: BookingDetails | null;
  setUpcomingBooking: (booking: BookingDetails | null) => void;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [upcomingBooking, setUpcomingBooking] = useState<BookingDetails | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setUpcomingBooking(null);
    }
  }, [session?.user?.id]);

  const clearBooking = () => {
    setUpcomingBooking(null);
  };

  return (
    <BookingContext.Provider value={{ upcomingBooking, setUpcomingBooking, clearBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
