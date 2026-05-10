export interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  mode: string;
  pricing: { label: string; amount: string }[];
  whatToExpect: string[];
  ctaText: string;
  bottomNote: string;
}

export const mockEvents: Record<string, EventData> = {
  "har-ghar-dhyan": {
    id: "har-ghar-dhyan",
    title: "Har Ghar Dhyan",
    description: "A 7-day monthly guided meditation experience by Dr. Neelam Parwani, designed to help you build a consistent meditation practice at home through breathwork, mudras, and awareness techniques.",
    date: "7 Days Every Month",
    time: "12:00 PM - 1:00 PM",
    mode: "Online",
    pricing: [
      { label: "Per Month", amount: "199" },
    ],
    whatToExpect: [
      "Guided meditation using Mudra + Breath framework",
      "Relaxation and awareness practices",
      "Tools to build a daily meditation habit",
      "Suitable for beginners to advanced participants",
    ],
    ctaText: "Join Event",
    bottomNote: "",
  },
  "listening-ear": {
    id: "listening-ear",
    title: "Listening Ear (Suno - Sunao)",
    description: "A monthly community listening circle where you can share your thoughts, emotions, and experiences in a safe, confidential space. Created to celebrate 11 years of Nature's Grace, this gathering focuses on connection, trust, and the simple power of being heard.",
    date: "Once a Month",
    time: "6:00 PM - 7:30 PM",
    mode: "In Person",
    pricing: [
      { label: "Per Month (excluding eatables)", amount: "199" },
      { label: "3 Months", amount: "599" },
    ],
    whatToExpect: [
      "Confidential, non-judgmental sharing circle",
      "Option to speak or simply listen",
      "Facilitated by Nature's Grace wellness team",
      "Small group setting for meaningful connection",
    ],
    ctaText: "Register Interest",
    bottomNote: "",
  },
};

export interface DiscussionReply {
  id: string;
  author: string;
  text: string;
  timeAgo: string;
}

export interface Discussion {
  id: string;
  title: string;
  question: string;
  date: string;
  replies: DiscussionReply[];
}

export const mockDiscussions: Record<string, Discussion> = {
  "daily-wellness": {
    id: "daily-wellness",
    title: "Daily Wellness Discussion",
    question: "How do you nurture your inner peace in daily life?",
    date: "Today",
    replies: [
      {
        id: "r1",
        author: "Priya",
        text: "I start each morning with 10 minutes of silent meditation before checking my phone. It really sets a calm tone for the day.",
        timeAgo: "2 hours ago",
      },
      {
        id: "r2",
        author: "Arjun",
        text: "Walking in nature helps me the most. Even a short walk in the park during lunch break makes a difference.",
        timeAgo: "3 hours ago",
      },
      {
        id: "r3",
        author: "Meera",
        text: "Gratitude journaling before bed. Writing three things I'm grateful for helps me sleep peacefully.",
        timeAgo: "5 hours ago",
      },
      {
        id: "r4",
        author: "Vikram",
        text: "Deep breathing whenever I feel stressed. Just 5 slow breaths can completely shift my state.",
        timeAgo: "6 hours ago",
      },
      {
        id: "r5",
        author: "Ananya",
        text: "Limiting news and social media consumption. Being mindful about what I let into my mental space.",
        timeAgo: "8 hours ago",
      },
    ],
  },
};
