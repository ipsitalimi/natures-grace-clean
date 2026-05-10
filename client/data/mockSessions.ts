export interface SessionData {
  id: string;
  practitionerName: string;
  serviceType: string;
  date: string;
  status: "Completed" | "Upcoming" | "Cancelled";
  duration: string;
  price: string;
  time: string;
}

export const mockSessions: SessionData[] = [
  {
    id: "1",
    practitionerName: "Ms Neelam",
    serviceType: "Reiki",
    date: "Jan 20, 2025",
    status: "Completed",
    duration: "45 min",
    price: "1,500",
    time: "3:00 PM",
  },
  {
    id: "2",
    practitionerName: "Dr Maya",
    serviceType: "Counseling",
    date: "Jan 15, 2025",
    status: "Completed",
    duration: "60 min",
    price: "2,000",
    time: "11:00 AM",
  },
  {
    id: "3",
    practitionerName: "Arun",
    serviceType: "Financial Guidance",
    date: "Jan 10, 2025",
    status: "Completed",
    duration: "30 min",
    price: "1,200",
    time: "2:00 PM",
  },
  {
    id: "4",
    practitionerName: "Ms Neelam",
    serviceType: "Reiki",
    date: "Upcoming",
    status: "Upcoming",
    duration: "45 min",
    price: "1,500",
    time: "3:00 PM",
  },
  {
    id: "5",
    practitionerName: "Priya",
    serviceType: "Meditation",
    date: "Dec 28, 2024",
    status: "Cancelled",
    duration: "30 min",
    price: "800",
    time: "10:00 AM",
  },
];
