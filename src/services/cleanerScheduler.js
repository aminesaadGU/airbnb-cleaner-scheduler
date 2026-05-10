// Simple cleaner assignment logic for MVP
// - prefers cleaners who cover the booking zone
// - respects a naive capacity per day count

const dayKey = (isoDate) => isoDate.split('T')[0];

function assignmentsForDay(assignments, cleanerId, isoDate) {
  const key = dayKey(isoDate);
  return assignments.filter(a => a.assignedCleaner === cleanerId && dayKey(a.startDate) === key).length;
}

function assignCleaner(booking, cleaners, allBookings) {
  // prefer cleaners covering the zone
  const candidates = cleaners.filter(c => c.zones.includes(booking.zone));
  const pool = candidates.length ? candidates : cleaners;

  // sort by least assigned that day
  pool.sort((a, b) => {
    const aCount = assignmentsForDay(allBookings, a.id, booking.startDate);
    const bCount = assignmentsForDay(allBookings, b.id, booking.startDate);
    return aCount - bCount;
  });

  for (const c of pool) {
    const already = assignmentsForDay(allBookings, c.id, booking.startDate);
    if (already < (c.capacityPerDay || 2)) return c;
  }
  return null;
}

module.exports = { assignCleaner };
