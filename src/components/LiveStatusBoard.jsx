import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { AuthContext, ToastContext } from '../App';
import { getEmployeeStatus, STATUS_COLORS, todayKey, normalizeSchedule } from '../utils/schedule';
import { Radio, Clock, UserX2, Settings, X, Save } from 'lucide-react';

export default function LiveStatusBoard() {
  const { currentUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const isAdmin = currentUser?.role === 'admin';

  const [employees, setEmployees] = useState([]);
  const [now, setNow] = useState(new Date());
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  useEffect(() => {
    loadData();
    const refreshInterval = setInterval(loadData, 60000);
    const clockInterval = setInterval(() => setNow(new Date()), 15000);
    return () => { clearInterval(refreshInterval); clearInterval(clockInterval); };
  }, []);

  const loadData = async () => {
    try {
      const users = await db.getUsers();
      setEmployees(users.filter(u => u.role === 'employee'));
    } catch (e) {
      console.error('Failed to load employee status data', e);
    }
  };

  const Avatar = ({ emp, size = 44 }) => (
    emp.photoURL ? (
      <img src={emp.photoURL} alt={emp.name} style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        border: '2px solid var(--border-color)', flexShrink: 0
      }} />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        backgroundColor: 'var(--primary)', color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.4
      }}>
        {emp.name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    )
  );

  const withStatus = employees
    .filter(e => e.status === 'Active')
    .map(e => ({ emp: e, status: getEmployeeStatus(e, now) }));

  const online = withStatus.filter(x => x.status.status === 'online');
  const soon = withStatus.filter(x => x.status.status === 'soon');
  const offDuty = withStatus.filter(x => x.status.status === 'off');

  const Section = ({ title, items, tone }) => (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: tone }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h3>
        <span className="badge" style={{ backgroundColor: `${tone}20`, color: tone }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="glass-card" style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          No one here right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {items.map(({ emp, status }) => (
            <div key={emp.id} className="glass-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', borderLeft: `4px solid ${tone}` }}>
              <Avatar emp={emp} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                  {status.mode === 'wfh' && (
                    <span className="badge" style={{ fontSize: '0.62rem', backgroundColor: 'rgba(101, 178, 232, 0.15)', color: 'var(--primary)' }}>WFH</span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{emp.designation || 'Staff Member'}</div>
                <div style={{ fontSize: '0.75rem', color: tone, fontWeight: 600, marginTop: '0.15rem' }}>{status.detail || status.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Live Office Status</h2>
          <p>Real-time view of who's in the office right now, based on each employee's schedule.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-primary)' }}>
            <Radio size={14} />
            <span>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • Today: {todayKey(now)}</span>
          </div>
          {isAdmin && (
            <button onClick={() => setIsScheduleOpen(true)} className="btn btn-primary">
              <Settings size={16} />
              <span>Set Schedules</span>
            </button>
          )}
        </div>
      </div>

      <Section title="In Office Now" items={online} tone={STATUS_COLORS.online} />
      <Section title="Starting Soon" items={soon} tone={STATUS_COLORS.soon} />

      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <UserX2 size={16} color={STATUS_COLORS.off} />
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Off Duty</h3>
          <span className="badge" style={{ backgroundColor: `${STATUS_COLORS.off}20`, color: STATUS_COLORS.off }}>{offDuty.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {offDuty.map(({ emp, status }) => (
            <div key={emp.id} className="glass-card" style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', opacity: 0.75, padding: '0.75rem' }}>
              <Avatar emp={emp} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{status.detail || status.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {employees.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p>No employees registered yet.</p>
        </div>
      )}

      {isScheduleOpen && (
        <ScheduleModal
          employees={employees}
          currentUser={currentUser}
          showToast={showToast}
          onClose={() => setIsScheduleOpen(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function ScheduleModal({ employees, currentUser, showToast, onClose, onSaved }) {
  const [drafts, setDrafts] = useState(() => {
    const map = {};
    employees.forEach(emp => {
      map[emp.id] = normalizeSchedule(emp.schedule);
    });
    return map;
  });
  const [saving, setSaving] = useState(false);

  const setDraft = (empId, block, patch) => {
    setDrafts(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [block]: { ...prev[empId][block], ...patch } }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(employees.map(emp => db.updateUser(emp.id, { schedule: drafts[emp.id] })));
      await db.addLog(currentUser.id, 'Update Schedules', `Updated work schedules for ${employees.length} employee(s)`);
      showToast('Schedules saved successfully.', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      showToast('Failed to save schedules.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem' }}>Employee Work Schedules</h3>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Each employee has two recurring shifts: Mon–Fri regular office hours, and Sat–Sun work-from-home hours. Stays in effect every week until changed.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {employees.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No employees to schedule yet.</div>
            )}
            {employees.map(emp => (
              <div key={emp.id} style={{
                padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>{emp.name}</div>
                <ScheduleEditorFields schedule={drafts[emp.id]} onChange={(block, patch) => setDraft(emp.id, block, patch)} />
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="button" onClick={handleSaveAll} className="btn btn-primary" disabled={saving || employees.length === 0}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save All Schedules'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable pair of shift-time editors: Mon-Fri regular hours, Sat-Sun WFH hours.
// Exported so employees can edit their own schedule from their profile.
export function ScheduleEditorFields({ schedule, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          Monday – Friday (Regular Workdays)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="time"
            className="form-control"
            style={{ maxWidth: '140px' }}
            value={schedule.weekday.start}
            onChange={(e) => onChange('weekday', { start: e.target.value })}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="time"
            className="form-control"
            style={{ maxWidth: '140px' }}
            value={schedule.weekday.end}
            onChange={(e) => onChange('weekday', { end: e.target.value })}
          />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          Saturday – Sunday (Work From Home)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="time"
            className="form-control"
            style={{ maxWidth: '140px' }}
            value={schedule.weekend.start}
            onChange={(e) => onChange('weekend', { start: e.target.value })}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="time"
            className="form-control"
            style={{ maxWidth: '140px' }}
            value={schedule.weekend.end}
            onChange={(e) => onChange('weekend', { end: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
