export function useCancellationPolicy() {
  // Keep this aligned with the server's fixed cancellation/refund calculation.
  const freeHours = 24;
  const feePercent = 20;

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
    if (hoursUntil > freeHours) {
      return `You are cancelling more than ${freeHours} hours before your session. A ${feePercent}% cancellation fee applies, and 80% of the session amount is refundable.`;
    }
    return `Cancellations within ${freeHours} hours of the session are non-refundable.`;
  }

  function orderCancelMessage(): string {
    return `Cancelling this order may affect refund eligibility. Paid orders are reviewed per our Refund Policy.`;
  }

  return { freeHours, feePercent, bookingCancelMessage, orderCancelMessage };
}
