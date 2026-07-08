import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEFAULT_MOOD_OPTIONS = ["Peaceful", "Grateful", "Anxious", "Hopeful"] as const;
export const MOOD_STORAGE_DELIMITER = " · ";
export const MAX_SELECTED_MOODS = 3;
export const MAX_CUSTOM_MOODS = 5;

const CUSTOM_MOODS_KEY = "@journal_custom_moods";

export function formatMoodsForStorage(moods: string[]): string | null {
  const trimmed = moods.map((m) => m.trim()).filter(Boolean);
  return trimmed.length > 0 ? trimmed.join(MOOD_STORAGE_DELIMITER) : null;
}

export function parseMoodsFromStorage(mood: string | null | undefined): string[] {
  if (!mood?.trim()) return [];
  return mood
    .split(MOOD_STORAGE_DELIMITER)
    .map((m) => m.trim())
    .filter(Boolean);
}

export function getMoodColor(mood: string): string {
  switch (mood) {
    case "Peaceful":
      return "#7BA68A";
    case "Grateful":
      return "#C4A97A";
    case "Anxious":
      return "#C47A7A";
    case "Hopeful":
      return "#7AAEC4";
    default:
      return "#6B8F7A";
  }
}

export async function loadCustomMoods(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_MOODS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m): m is string => typeof m === "string")
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, MAX_CUSTOM_MOODS);
  } catch {
    return [];
  }
}

export async function saveCustomMoods(moods: string[]): Promise<void> {
  const trimmed = moods.map((m) => m.trim()).filter(Boolean).slice(0, MAX_CUSTOM_MOODS);
  await AsyncStorage.setItem(CUSTOM_MOODS_KEY, JSON.stringify(trimmed));
}
