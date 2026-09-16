export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_INDEX_TO_KEY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DEFAULT_DAY = { enabled: false, start: '09:00', end: '18:00' };

export function emptyWeeklySchedule() {
  return DAYS.reduce((acc, day) => {
    acc[day] = { ...DEFAULT_DAY, enabled: day !== 'Fri' && day !== 'Sat' };
    return acc;
  }, {});
}

export function todayKey(date = new Date()) {
  return DAY_INDEX_TO_KEY[date.getDay()];
}

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// "Starting soon" window, in minutes
export const SOON_WINDOW_MINUTES = 30;

// Determines an employee's live presence status based on their weekly schedule and the current time.
export function getEmployeeStatus(employee, now = new Date()) {
  const schedule = employee.weeklySchedule || {};
  const key = todayKey(now);
  const day = schedule[key];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (!day || !day.enabled || !day.start || !day.end) {
    return { status: 'off', label: 'Not Scheduled Today', detail: '' };
  }

  const start = toMinutes(day.start);
  const end = toMinutes(day.end);

  if (nowMinutes >= start && nowMinutes < end) {
    const minutesLeft = end - nowMinutes;
    return {
      status: 'online',
      label: 'In Office Now',
      detail: minutesLeft <= 30 ? `Shift ends in ${minutesLeft} min` : `Until ${day.end}`
    };
  }

  if (nowMinutes < start && start - nowMinutes <= SOON_WINDOW_MINUTES) {
    return {
      status: 'soon',
      label: 'Starting Soon',
      detail: `In ${start - nowMinutes} min (${day.start})`
    };
  }

  if (nowMinutes < start) {
    return { status: 'off', label: 'Not In Yet', detail: `Starts at ${day.start}` };
  }

  return { status: 'off', label: 'Shift Ended', detail: `Ended at ${day.end}` };
}

export const STATUS_COLORS = {
  online: '#10b981',
  soon: '#f59e0b',
  off: '#94a3b8'
};
