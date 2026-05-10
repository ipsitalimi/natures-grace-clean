export interface PractitionerSession {
  id: string;
  userName: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  status: "Upcoming" | "Completed" | "Cancelled";
  notes?: string;
}

export const practitionerSessions: PractitionerSession[] = [
  {
    id: "ps-1",
    userName: "Limi Sharma",
    service: "Reiki Healing",
    date: "Feb 17, 2026",
    time: "10:00 AM",
    duration: "60 min",
    status: "Upcoming",
    notes: "First session - focus on chakra alignment",
  },
  {
    id: "ps-2",
    userName: "Ananya Patel",
    service: "Energy Balancing",
    date: "Feb 17, 2026",
    time: "2:00 PM",
    duration: "45 min",
    status: "Upcoming",
  },
  {
    id: "ps-3",
    userName: "Rohan Mehta",
    service: "Chakra Healing",
    date: "Feb 16, 2026",
    time: "11:00 AM",
    duration: "60 min",
    status: "Completed",
    notes: "Follow-up session, good progress",
  },
  {
    id: "ps-4",
    userName: "Priya Kapoor",
    service: "Spiritual Counseling",
    date: "Feb 15, 2026",
    time: "3:00 PM",
    duration: "45 min",
    status: "Completed",
  },
  {
    id: "ps-5",
    userName: "Vikram Singh",
    service: "Reiki Healing",
    date: "Feb 14, 2026",
    time: "9:00 AM",
    duration: "60 min",
    status: "Cancelled",
    notes: "Client requested reschedule",
  },
  {
    id: "ps-6",
    userName: "Meera Joshi",
    service: "Energy Balancing",
    date: "Feb 18, 2026",
    time: "11:00 AM",
    duration: "45 min",
    status: "Upcoming",
  },
  {
    id: "ps-7",
    userName: "Arjun Nair",
    service: "Chakra Healing",
    date: "Feb 13, 2026",
    time: "4:00 PM",
    duration: "60 min",
    status: "Completed",
  },
];

export const practitionerEarnings = {
  thisMonth: 12500,
  lastMonth: 10800,
  totalSessions: 42,
  avgRating: 4.8,
};

export const practitionerReviews = [
  {
    id: "pr-1",
    userName: "Limi Sharma",
    service: "Reiki Healing",
    rating: 5,
    text: "Deeply calming and transformative experience. Felt a real shift in energy.",
    date: "Feb 12, 2026",
  },
  {
    id: "pr-2",
    userName: "Rohan Mehta",
    service: "Chakra Healing",
    rating: 5,
    text: "Very professional and intuitive healer. Highly recommend.",
    date: "Feb 10, 2026",
  },
  {
    id: "pr-3",
    userName: "Priya Kapoor",
    service: "Spiritual Counseling",
    rating: 4,
    text: "Insightful session with practical guidance I can apply daily.",
    date: "Feb 8, 2026",
  },
  {
    id: "pr-4",
    userName: "Ananya Patel",
    service: "Energy Balancing",
    rating: 5,
    text: "The most peaceful session I've ever had. Truly gifted practitioner.",
    date: "Feb 5, 2026",
  },
];

export const PRACTITIONER_EMAIL = "practitioner@naturesgrace.com";
export const PRACTITIONER_PASS = "pract@123";
