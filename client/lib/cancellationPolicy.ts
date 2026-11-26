import { usePlatformConfig } from "@/context/PlatformConfigContext";

export function useCancellationPolicy() {
  const { settings } = usePlatformConfig();
  const freeHours = settings.freeCancellationHours ?? 24;
  const feePercent = settings.cancellationFeePercent ?? 100;

  function bookingCancelMessage(sessionDateIso: string): string {
    // Session history stores the date as YYYY-MM-DD and time as e.g. "9:00 AM".
    // JavaScript does not reliably parse the combined "T9:00 AM" format.
    const match = sessionDateIso.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    );
    let sessionTime: number;

    if (match) {
      const [, year, month, day, hourText, minuteText, meridiem] = match;
      let hour = Number(hourText) % 12;
      if (meridiem.toUpperCase() === "PM") hour += 12;
      sessionTime = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour,
        Number(minuteText)
      ).getTime();
    } else {
      sessionTime = new Date(sessionDateIso).getTime();
    }

    if (!Number.isFinite(sessionTime)) {
      return "We could not calculate the cancellation window for this session. Please contact support before cancelling.";
    }

    const hoursUntil = (sessionTime - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil >= freeHours) {
      return `You are cancelling more than ${freeHours} hours before your session. You may be eligible for a full refund per our Refund Policy.`;
    }
    if (feePercent >= 100) {
      return `You are cancelling within the ${freeHours}-hour window. You may not be eligible for a refund.`;
    }
    return `You are cancelling within the ${freeHours}-hour window. A ${feePercent}% cancellation fee may apply.`;
  }

  function orderCancelMessage(): string {
    return `Cancelling this order may affect refund eligibility. Paid orders are reviewed per our Refund Policy.`;
  }

  return { freeHours, feePercent, bookingCancelMessage, orderCancelMessage };
}
