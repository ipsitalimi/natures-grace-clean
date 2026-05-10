export interface NotificationItem {
  id: string;
  message: string;
  time: string;
  unread: boolean;
}

export const mockNotifications: NotificationItem[] = [
  {
    id: "1",
    message: "Your session with Ms Neelam is tomorrow at 3:00 PM",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "2",
    message: "New Har Ghar Dhyan event is available",
    time: "Yesterday",
    unread: true,
  },
  {
    id: "3",
    message: "You wrote 3 journal entries this week",
    time: "3 days ago",
    unread: false,
  },
  {
    id: "4",
    message: "Welcome to Nature's Grace",
    time: "Last week",
    unread: false,
  },
];
