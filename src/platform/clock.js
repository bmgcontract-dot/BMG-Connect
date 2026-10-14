// Central clock. Replaces ad-hoc `new Date().toISOString().split('T')[0]` and
// local-timezone date math scattered through App.jsx, which shifted the reported
// day whenever the runtime timezone was not UTC (the app's business day is
// Asia/Bangkok, UTC+7). All "what day/month is it" questions go through here so
// month-scoped queries and date stamps agree across devices.
//
// Interface (small, deep): the caller injects a `now` source (a function
// returning epoch ms) at the composition root; every date question is answered in
// the business timezone. Tests pass a fixed `now` and assert exact strings —
// including the midnight, month-end, and year boundaries the audit called out.

const BUSINESS_TIME_ZONE = 'Asia/Bangkok';

// Intl gives a correct, DST-free wall-clock date for the zone without pulling a
// date library. en-CA yields YYYY-MM-DD parts directly.
function zonedParts(epochMs, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date(epochMs));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { year: get('year'), month: get('month'), day: get('day') };
}

// Create a clock. `now` returns epoch milliseconds (default: Date.now, wrapped so
// the ban on argless `new Date()` elsewhere is centralised here). `timeZone`
// defaults to the business zone but is injectable for tests.
export function createClock({ now = () => Date.now(), timeZone = BUSINESS_TIME_ZONE } = {}) {
  return {
    // Milliseconds since epoch, for durations/sorting.
    nowMs() {
      return now();
    },
    // Full ISO-8601 instant (UTC), for updatedAt-style audit stamps.
    nowIso() {
      return new Date(now()).toISOString();
    },
    // Business-timezone calendar date, 'YYYY-MM-DD'. This is the value that must
    // not drift across timezones — used for daily reports, readings, etc.
    today() {
      const { year, month, day } = zonedParts(now(), timeZone);
      return `${year}-${month}-${day}`;
    },
    // Business-timezone month, 'YYYY-MM'. Drives month-scoped queries.
    thisMonth() {
      const { year, month } = zonedParts(now(), timeZone);
      return `${year}-${month}`;
    },
  };
}

// The production singleton. Import { clock } and call clock.today() / clock.thisMonth().
export const clock = createClock();

export { BUSINESS_TIME_ZONE };
