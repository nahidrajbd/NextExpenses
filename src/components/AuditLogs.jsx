import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { History, Search, Calendar, Shield } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  useEffect(() => {
    loadLogs();
  }, [searchQuery, actionFilter]);

  const loadLogs = () => {
    let list = db.getLogs();

    // Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(l =>
        l.description.toLowerCase().includes(q) ||
        getActorName(l.actorId).toLowerCase().includes(q) ||
        l.actionType.toLowerCase().includes(q)
      );
    }

    // Action Type Filter
    if (actionFilter !== 'All') {
      list = list.filter(l => l.actionType === actionFilter);
    }

    setLogs(list);
  };

  const getActorName = (id) => {
    const user = db.getUsers().find(u => u.id === id);
    return user ? `${user.name} (${user.role})` : 'Unknown Actor';
  };

  const uniqueActions = ['Approve Expense', 'Reject Expense', 'Record Payment', 'Login', 'Logout', 'Create Category', 'Update Category'];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>System Audit Logs</h2>
          <p>Trace administrative workflows, logins, and reimbursement payments.</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          {/* Text Search */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Search logs</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search log descriptions..."
                className="form-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Action Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Action Type</label>
            <select
              className="form-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={20} color="var(--primary)" />
          <span>Audit Log Trace</span>
        </h3>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <Shield size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No audit events match your search query.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action Type</th>
                  <th>Event Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} className="text-muted" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{getActorName(log.actorId)}</td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: log.actionType.includes('Approve') ? 'var(--success-light)' :
                                         log.actionType.includes('Reject') ? 'var(--danger-light)' :
                                         log.actionType.includes('Payment') ? 'var(--primary-light)' : 'var(--bg-primary)',
                        color: log.actionType.includes('Approve') ? 'var(--success)' :
                               log.actionType.includes('Reject') ? 'var(--danger)' :
                               log.actionType.includes('Payment') ? 'var(--primary)' : 'var(--text-secondary)'
                      }}>
                        {log.actionType}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
