import { useState, useCallback } from "react";

export interface SessionOffering {
  id: string;
  sessionType: string;
  duration: number;
  price: number;
  notes: string;
}

const defaultOfferings: SessionOffering[] = [
  {
    id: "off-1",
    sessionType: "Healing",
    duration: 15,
    price: 500,
    notes: "Quick energy reset and chakra check",
  },
  {
    id: "off-2",
    sessionType: "Counseling",
    duration: 30,
    price: 1200,
    notes: "Guided conversation for emotional clarity",
  },
  {
    id: "off-3",
    sessionType: "Therapy",
    duration: 45,
    price: 1800,
    notes: "",
  },
];

let offerings: SessionOffering[] = [...defaultOfferings];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export const offeringsStore = {
  getOfferings(): SessionOffering[] {
    return offerings;
  },
  addOffering(offering: SessionOffering) {
    offerings = [...offerings, offering];
    notify();
  },
  updateOffering(offering: SessionOffering) {
    offerings = offerings.map((o) => (o.id === offering.id ? offering : o));
    notify();
  },
  deleteOffering(id: string) {
    offerings = offerings.filter((o) => o.id !== id);
    notify();
  },
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};

export function useOfferingsStore() {
  const [, setTick] = useState(0);

  const forceUpdate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useState(() => {
    const unsub = offeringsStore.subscribe(forceUpdate);
    return unsub;
  });

  return {
    offerings: offeringsStore.getOfferings(),
    addOffering: offeringsStore.addOffering,
    updateOffering: offeringsStore.updateOffering,
    deleteOffering: offeringsStore.deleteOffering,
  };
}
