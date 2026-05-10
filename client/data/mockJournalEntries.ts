export interface JournalEntry {
  id: string;
  date: string;
  preview: string;
}

export interface JournalEntryContent {
  date: string;
  fullText: string;
}

export const mockJournalEntries: JournalEntry[] = [
  {
    id: "1",
    date: "January 28, 2026",
    preview: "Today was a peaceful day. I spent time in the garden and felt truly connected to nature...",
  },
  {
    id: "2",
    date: "January 25, 2026",
    preview: "Reflecting on the week, I'm grateful for the small moments of joy that brightened each day...",
  },
  {
    id: "3",
    date: "January 22, 2026",
    preview: "Started my morning meditation practice again. It's amazing how 10 minutes can shift my entire perspective...",
  },
  {
    id: "4",
    date: "January 18, 2026",
    preview: "Had a wonderful conversation with an old friend. Sometimes reconnecting with people reminds us of who we are...",
  },
  {
    id: "5",
    date: "January 15, 2026",
    preview: "The rain today felt cleansing. I sat by the window and let my thoughts flow freely without judgment...",
  },
];

export const mockJournalEntriesContent: Record<string, JournalEntryContent> = {
  "1": {
    date: "January 28, 2026",
    fullText:
      "Today was a peaceful day. I spent time in the garden and felt truly connected to nature. The winter sun was gentle, and I could hear birds singing in the distance.\n\nI realized that these simple moments are what life is really about. Not the busy schedules or the endless to-do lists, but the quiet appreciation of what's right in front of us.\n\nI want to carry this feeling with me throughout the week. To remember that peace isn't something we find \u2013 it's something we create in how we choose to see the world.",
  },
  "2": {
    date: "January 25, 2026",
    fullText:
      "Reflecting on the week, I'm grateful for the small moments of joy that brightened each day. A warm cup of tea in the morning. A kind word from a colleague. The way the light fell through my window at sunset.\n\nIt's easy to overlook these things when we're rushing through life. But today I choose to pause and acknowledge them.\n\nEach small joy is a thread in the fabric of a meaningful life.",
  },
  "3": {
    date: "January 22, 2026",
    fullText:
      "Started my morning meditation practice again. It's amazing how 10 minutes can shift my entire perspective for the day.\n\nI've been resisting this for weeks, telling myself I don't have time. But the truth is, I don't have time NOT to do it. The clarity and calm it brings is invaluable.\n\nNote to self: consistency over perfection. Even 5 minutes is better than nothing.",
  },
  "4": {
    date: "January 18, 2026",
    fullText:
      "Had a wonderful conversation with an old friend. Sometimes reconnecting with people reminds us of who we are \u2013 or who we were, and how far we've come.\n\nWe talked about our dreams from years ago, some achieved, some transformed, some gently released. There's wisdom in knowing when to let go.\n\nI'm grateful for friendships that transcend time and distance.",
  },
  "5": {
    date: "January 15, 2026",
    fullText:
      "The rain today felt cleansing. I sat by the window and let my thoughts flow freely without judgment.\n\nThere's something about watching rain that invites reflection. Each drop seems to carry away a little of the mental clutter we accumulate.\n\nI emerged from that quiet hour feeling lighter, more present. Sometimes doing nothing is exactly what we need.",
  },
};

export const mockGratitudes = [
  { id: "1", text: "The warm sunshine on my morning walk", date: "Today" },
  { id: "2", text: "A good conversation with a friend", date: "Yesterday" },
  { id: "3", text: "Finding peace in a quiet moment", date: "Jan 27" },
  { id: "4", text: "A delicious home-cooked meal", date: "Jan 25" },
  { id: "5", text: "The sound of rain on the window", date: "Jan 23" },
];
