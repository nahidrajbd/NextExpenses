import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { getEmployeeStatus, STATUS_COLORS, todayKey } from '../utils/schedule';
import { Radio, Clock, UserX2 } from 'lucide-react';

export default function LiveStatusBoard() {
  const [employees, setEmployees] = useState([]);
  const [now, setNow] = useState(new Date());

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
                <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
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
          <p>Real-time view of who's in the office right now, based on scheduled work hours.</p>
        </div>
        <div className="badge" style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-primary)' }}>
          <Radio size={14} />
          <span>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • Today: {todayKey(now)}</span>
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
    </div>
  );
}
