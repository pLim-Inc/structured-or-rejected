'use strict';
/**
 * Due date of an invoice status that has to be reported within a number of days,
 * not counting Saturdays, Sundays and national holidays. Day 1 is the day after the event.
 *
 * The kit ships no holiday calendar: pass the national holidays in as 'YYYY-MM-DD'.
 * Confirm the counting rule with your tax team before you rely on it.
 */
function addBusinessDays(fromIso, days, holidays = []) {
  const skip = new Set(holidays);
  const d = new Date(`${fromIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Not a date: ${fromIso}`);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const weekday = d.getUTCDay();
    if (weekday === 0 || weekday === 6 || skip.has(d.toISOString().slice(0, 10))) continue;
    left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Spanish B2B e-invoicing: the status "paid in full" is due four days after the payment date. */
const statusDueDate = (paymentDate, holidays = []) => addBusinessDays(paymentDate, 4, holidays);

module.exports = { addBusinessDays, statusDueDate };
