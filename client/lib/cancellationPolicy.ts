import { usePlatformConfig } from "@/context/PlatformConfigContext";

export function useCancellationPolicy() {
  const { settings } = usePlatformConfig();
  const freeHours = settings.freeCancellationHours ?? 24;
  const feePercent = settings.cancellationFeePercent ?? 100;

  function bookingCancelMessage(sessionDateIso: string): string {
    const sessionTime = new Date(sessionDateIso).getTime();
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
