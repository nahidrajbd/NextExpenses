export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKEND_DAYS = ['Sat', 'Sun'];

const DAY_INDEX_TO_KEY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Two fixed recurring shifts per employee: Mon-Fri regular office hours,
// and Sat-Sun work-from-home hours. Stays in effect until changed.
export function defaultSchedule() {
  return {
    weekday: { start: '09:00', end: '18:00' },
    weekend: { start: '10:00', end: '15:00' }
  };
}

// Guards against stale/partial schedule shapes (e.g. documents saved under an
// earlier schedule format) so the editor UI never crashes on missing fields.
export function normalizeSchedule(raw) {
  const base = defaultSchedule();
  if (!raw || typeof raw !== 'object') return base;
  return {
    weekday: {
      start: raw.weekday?.start || base.weekday.start,
      end: raw.weekday?.end || base.weekday.end
    },
    weekend: {
      start: raw.weekend?.start || base.weekend.start,
      end: raw.weekend?.end || base.weekend.end
    }
  };
}

export function todayKey(date = new Date()) {
  return DAY_INDEX_TO_KEY[date.getDay()];
}

export function isWeekend(date = new Date()) {
  return WEEKEND_DAYS.includes(todayKey(date));
}

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Formats a "HH:MM" (24h) string as 12-hour clock time with AM/PM, e.g. "09:00" -> "9:00 AM".
export function formatTime12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// "Starting soon" window, in minutes
export const SOON_WINDOW_MINUTES = 30;

// Determines an employee's live presence status based on their recurring schedule and the current time.
export function getEmployeeStatus(employee, now = new Date()) {
  const schedule = normalizeSchedule(employee.schedule);
  const weekend = isWeekend(now);
  const shift = schedule[weekend ? 'weekend' : 'weekday'];
  const modeLabel = weekend ? 'WFH' : 'In Office';
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (!shift || !shift.start || !shift.end) {
    return { status: 'off', label: 'Not Scheduled Today', detail: '', mode: weekend ? 'wfh' : 'office' };
  }

  const start = toMinutes(shift.start);
  const end = toMinutes(shift.end);

  if (nowMinutes >= start && nowMinutes < end) {
    const minutesLeft = end - nowMinutes;
    const progress = Math.max(0, Math.min(100, Math.round(((nowMinutes - start) / (end - start)) * 100)));
    return {
      status: 'online',
      label: `${modeLabel} Now`,
      detail: minutesLeft <= 30 ? `Shift ends in ${minutesLeft} min` : `Until ${formatTime12(shift.end)}`,
      mode: weekend ? 'wfh' : 'office',
      progress,
      minutesLeft,
      shiftStart: shift.start,
      shiftEnd: shift.end
    };
  }

  if (nowMinutes < start && start - nowMinutes <= SOON_WINDOW_MINUTES) {
    return {
      status: 'soon',
      label: `${modeLabel} Starting Soon`,
      detail: `In ${start - nowMinutes} min (${formatTime12(shift.start)})`,
      mode: weekend ? 'wfh' : 'office',
      minutesUntil: start - nowMinutes
    };
  }

  if (nowMinutes < start) {
    return { status: 'off', label: 'Not In Yet', detail: `Starts at ${formatTime12(shift.start)}`, mode: weekend ? 'wfh' : 'office', minutesUntil: start - nowMinutes };
  }

  return { status: 'off', label: 'Shift Ended', detail: `Ended at ${formatTime12(shift.end)}`, mode: weekend ? 'wfh' : 'office' };
}

export const STATUS_COLORS = {
  online: '#10b981',
  soon: '#f59e0b',
  off: '#94a3b8'
};
