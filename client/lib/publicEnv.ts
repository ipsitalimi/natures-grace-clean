import Constants from "expo-constants";

function readEnvString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readExtraEnv(name: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  return readEnvString(extra?.[name]);
}

export function pickPublicEnv(
  staticValue: string | undefined,
  extraName: string
): string | undefined {
  return readEnvString(staticValue) ?? readExtraEnv(extraName);
}
