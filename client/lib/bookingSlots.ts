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

function slotsBetween(start: string, end: string, stepMinutes = 60): string[] {
  const startMin = parseTime12h(start);
  const endMin = parseTime12h(end);
  if (startMin === null || endMin === null || endMin <= startMin) {
    return [];
  }

  const slots: string[] = [];
  for (let t = startMin; t < endMin; t += stepMinutes) {
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
    const iso = date.toISOString().slice(0, 10);
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
  availability: OfferingAvailabilityState
): string[] {
  if (availability.alwaysAvailable) {
    return slotsBetween(availability.globalTiming.start, availability.globalTiming.end);
  }

  if (!availability.selectedDates.includes(isoDate)) {
    return [];
  }

  if (availability.timingMode === "custom" && availability.dateTimings[isoDate]) {
    const timing = availability.dateTimings[isoDate];
    return slotsBetween(timing.start, timing.end);
  }

  return slotsBetween(availability.globalTiming.start, availability.globalTiming.end);
}

export function isDateBookable(isoDate: string, availability: OfferingAvailabilityState): boolean {
  if (availability.alwaysAvailable) return true;
  return availability.selectedDates.includes(isoDate);
}
