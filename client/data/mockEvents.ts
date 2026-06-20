import type { Discussion } from "@/data/discussions";

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

export type { Discussion, DiscussionReply } from "@/data/discussions";
