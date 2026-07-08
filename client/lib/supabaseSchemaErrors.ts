/** Detect PostgREST / Supabase errors for columns not yet migrated. */
export function isMissingColumnError(message: string | undefined, column: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes(column.toLowerCase()) &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find"))
  );
}
