export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_INDEX_TO_KEY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// A single recurring shift applied to the selected days each week, until changed.
export function defaultSchedule() {
  return { start: '09:00', end: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sun'] };
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

// Determines an employee's live presence status based on their recurring schedule and the current time.
export function getEmployeeStatus(employee, now = new Date()) {
  const schedule = employee.schedule;
  const key = todayKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (!schedule || !schedule.start || !schedule.end || !schedule.days?.includes(key)) {
    return { status: 'off', label: 'Not Scheduled Today', detail: '' };
  }

  const start = toMinutes(schedule.start);
  const end = toMinutes(schedule.end);

  if (nowMinutes >= start && nowMinutes < end) {
    const minutesLeft = end - nowMinutes;
    return {
      status: 'online',
      label: 'In Office Now',
      detail: minutesLeft <= 30 ? `Shift ends in ${minutesLeft} min` : `Until ${schedule.end}`
    };
  }

  if (nowMinutes < start && start - nowMinutes <= SOON_WINDOW_MINUTES) {
    return {
      status: 'soon',
      label: 'Starting Soon',
      detail: `In ${start - nowMinutes} min (${schedule.start})`
    };
  }

  if (nowMinutes < start) {
    return { status: 'off', label: 'Not In Yet', detail: `Starts at ${schedule.start}` };
  }

  return { status: 'off', label: 'Shift Ended', detail: `Ended at ${schedule.end}` };
}

export const STATUS_COLORS = {
  online: '#10b981',
  soon: '#f59e0b',
  off: '#94a3b8'
};
