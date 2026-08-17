// Refund math: value of visits not yet delivered, minus the total discount
// the customer received across the whole booking (matches the site's
// long-standing "applied discount total is deducted from any refund"
// policy). Visits "delivered" is an estimate — this app only tracks a
// single scheduled_date per booking (not one row per recurring visit), so
// delivered visits are inferred from how much time has passed since that
// first visit at the plan's cleaning frequency, capped at what was paid for.

function frequencyIntervalDays(page, frequency) {
  const n = parseInt(frequency, 10) || 1;
  const isWeeklyCadence = !frequency.toLowerCase().includes('monthly');
  if (isWeeklyCadence) {
    return Math.max(1, Math.round(7 / n));
  }
  if (frequency.includes('4 visits')) return 7;
  if (frequency.includes('2 visits')) return 14;
  return 30;
}

const ONE_TIME_CANCELLATION_SURCHARGE = 50;

export function estimateRefund(booking) {
  const visitsCount = Number(booking.visits_count) || 1;
  const perVisitPrice = Number(booking.per_visit_price) || 0;
  const afterFrequencyPrice = Number(booking.after_frequency_price);
  const referencePrice = Number.isFinite(afterFrequencyPrice) ? afterFrequencyPrice : perVisitPrice;

  let visitsDelivered = 0;
  if (booking.scheduled_date) {
    const scheduledDate = new Date(String(booking.scheduled_date).slice(0, 10) + 'T00:00:00');
    const daysSince = (Date.now() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 0) {
      const intervalDays = frequencyIntervalDays(booking.page, booking.frequency || '');
      visitsDelivered = Math.min(visitsCount, Math.floor(daysSince / intervalDays) + 1);
    }
  }
  const visitsRemaining = Math.max(0, visitsCount - visitsDelivered);

  // One-time bookings only ever have a single visit. If it was never
  // performed, the customer gets everything they paid back minus a flat
  // cancellation surcharge — not the general remaining-value-minus-discount
  // math (there's no multi-visit discount to reconcile on a one-time booking).
  if (booking.booking_type === 'One-time') {
    const totalPaid = Number(booking.final_total) || 0;
    const refundAmount = visitsDelivered === 0
      ? Math.round(Math.max(0, totalPaid - ONE_TIME_CANCELLATION_SURCHARGE) * 100) / 100
      : 0;
    return {
      visitsCount, visitsDelivered, visitsRemaining, perVisitPrice,
      totalDiscount: 0, remainingValue: totalPaid, refundAmount,
      cancellationSurcharge: visitsDelivered === 0 ? ONE_TIME_CANCELLATION_SURCHARGE : 0,
    };
  }

  const totalDiscount = Math.max(0, (referencePrice - perVisitPrice) * visitsCount);
  const remainingValue = visitsRemaining * perVisitPrice;
  const refundAmount = Math.round(Math.max(0, remainingValue - totalDiscount) * 100) / 100;

  return { visitsCount, visitsDelivered, visitsRemaining, perVisitPrice, totalDiscount, remainingValue, refundAmount };
}
