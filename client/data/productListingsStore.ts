export interface ProductListing {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}

const defaultListings: ProductListing[] = [
  {
    id: "pl-1",
    name: "Switchword Energy Circle",
    category: "Spiritual Manifestation & Protection",
    price: 2499,
    stock: 24,
    description: "A handcrafted energy circle infused with powerful switchwords to amplify your intentions.",
  },
  {
    id: "pl-2",
    name: "Organic Rose Face Serum",
    category: "Mindful Radiance",
    price: 3499,
    stock: 15,
    description: "A lightweight serum blending rosehip oil, vitamin E, and aloe vera for natural radiance.",
  },
  {
    id: "pl-3",
    name: "Complete Puja Kit",
    category: "Sacred Rituals",
    price: 4500,
    stock: 12,
    description: "A thoughtfully assembled kit with incense, diyas, kumkum, and sacred accessories.",
  },
];

let listings: ProductListing[] = [...defaultListings];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export const productListingsStore = {
  getListings(): ProductListing[] {
    return listings;
  },
  getListingById(id: string): ProductListing | undefined {
    return listings.find((l) => l.id === id);
  },
  addListing(listing: ProductListing) {
    listings = [...listings, listing];
    notify();
  },
  updateListing(listing: ProductListing) {
    listings = listings.map((l) => (l.id === listing.id ? listing : l));
    notify();
  },
  deleteListing(id: string) {
    listings = listings.filter((l) => l.id !== id);
    notify();
  },
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
