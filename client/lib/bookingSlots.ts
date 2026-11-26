import type { OfferingAvailabilityState } from "@/data/practitionerBookings";

function parseTime12h(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatTime12h(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${meridiem}`;
}

function slotsBetween(start: string, end: string, stepMinutes = 60, durationMinutes = 0): string[] {
  const startMin = parseTime12h(start);
  const endMin = parseTime12h(end);
  if (startMin === null || endMin === null || endMin <= startMin) {
    return [];
  }

  const slots: string[] = [];
  for (let t = startMin; t + durationMinutes <= endMin; t += stepMinutes) {
    slots.push(formatTime12h(t));
  }
  return slots;
}

export function getBookingDates(maxDays: number): {
  date: Date;
  dayName: string;
  dayNum: number;
  monthName: string;
  isoDate: string;
}[] {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = [];

  for (let i = 0; i < maxDays; i++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + i);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNum: date.getDate(),
      monthName: monthNames[date.getMonth()],
      isoDate: iso,
    });
  }
  return days;
}

export function getTimeSlotsForDate(
  isoDate: string,
  availability: OfferingAvailabilityState,
  durationMinutes = 0,
  busySlots: { session_time: string; duration_minutes: number }[] = []
): string[] {
  if (!availability.alwaysAvailable && !availability.selectedDates.includes(isoDate)) {
    return [];
  }

  const timing = !availability.alwaysAvailable &&
    availability.timingMode === "custom" &&
    availability.dateTimings[isoDate]
      ? availability.dateTimings[isoDate]
      : availability.globalTiming;

  const windows = [timing, ...(timing.additional ?? [])];
  const now = new Date();
  const todayIsoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return [...new Set(windows.flatMap((window) =>
    slotsBetween(window.start, window.end, 60, durationMinutes)
  ))]
    // Same-day bookings must start in the future; never offer elapsed slots.
    .filter((slot) => {
      if (isoDate !== todayIsoDate) return true;
      const slotMinutes = parseTime12h(slot);
      return slotMinutes !== null && slotMinutes > currentMinutes;
    })
    // Hide any candidate interval that overlaps an existing pending or confirmed booking.
    .filter((slot) => {
      const slotStart = parseTime12h(slot);
      if (slotStart === null || durationMinutes <= 0) return true;
      const slotEnd = slotStart + durationMinutes;
      return !busySlots.some((busy) => {
        const busyStart = parseTime12h(busy.session_time);
        if (busyStart === null || !Number.isFinite(busy.duration_minutes)) return false;
        const busyEnd = busyStart + Math.max(0, busy.duration_minutes);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
    })
    .sort((a, b) => (parseTime12h(a) ?? 0) - (parseTime12h(b) ?? 0));
}

export function isDateBookable(isoDate: string, availability: OfferingAvailabilityState): boolean {
  if (availability.alwaysAvailable) return true;
  return availability.selectedDates.includes(isoDate);
}
