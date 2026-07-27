import React, { useState, useEffect } from 'react';
import { db } from '../db';
import {
  Calendar,
  Hourglass,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  ArrowRight,
  TrendingDown,
  Users,
  Search,
  Wallet
} from 'lucide-react';

export default function AdminDashboard({ onViewChange }) {
  const [stats, setStats] = useState({
    todaySubmissions: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    totalOutstanding: 0,
    totalPaidThisMonth: 0
  });

  const [ledger, setLedger] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [expenses, payments, categories, ledgerData] = await Promise.all([
        db.getExpenses(),
        db.getPayments(),
        db.getCategories(),
        db.getEmployeeLedger()
      ]);
      
      setLedger(ledgerData);

    const todayStr = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    let todayCount = 0;
    let pendingCount = 0;
    let approvedMonthAmt = 0;
    let rejectedMonthCount = 0;
    let totalOutstandingAmt = ledgerData.reduce((sum, item) => sum + item.balanceDue, 0);
    let paidMonthAmt = 0;

    expenses.forEach(e => {
      // Today submissions
      if (e.date === todayStr) {
        todayCount++;
      }

      // Pending count
      if (e.status === 'Pending') {
        pendingCount++;
      }

      // Monthly metrics
      const eDate = new Date(e.date);
      if (eDate.getFullYear() === currentYear && eDate.getMonth() === currentMonth) {
        if (e.status === 'Approved') {
          approvedMonthAmt += e.amount;
        } else if (e.status === 'Rejected') {
          rejectedMonthCount++;
        }
      }
    });

    payments.forEach(p => {
      const pDate = new Date(p.date);
      if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
        paidMonthAmt += p.amount;
      }
    });

    setStats({
      todaySubmissions: todayCount,
      pendingApprovals: pendingCount,
      approvedThisMonth: approvedMonthAmt,
      rejectedThisMonth: rejectedMonthCount,
      totalOutstanding: totalOutstandingAmt,
      totalPaidThisMonth: paidMonthAmt
    });

    // Category Breakdown Calculation
    const approvedExpenses = expenses.filter(e => e.status === 'Approved');
    const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const breakdown = categories.map(cat => {
      const catExpenses = approvedExpenses.filter(e => e.categoryId === cat.id);
      const amount = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      const percentage = totalApproved > 0 ? (amount / totalApproved) * 100 : 0;
      return {
        category: cat,
        amount,
        percentage
      };
    }).sort((a, b) => b.amount - a.amount);

    setCategoryBreakdown(breakdown);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    }
  };

  const formatBDT = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount).replace('BDT', '৳');
  };

  const filteredLedger = ledger.filter(item => 
    item.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.employee.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Colors list for SVG Chart segments
  const colors = ['#6366f1', '#10b981', '#fbbf24', '#06b6d4', '#ec4899', '#f43f5e', '#8b5cf6'];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Admin Control Center</h2>
          <p>Real-time corporate office expense metrics and employee outstanding ledgers.</p>
        </div>
        <button onClick={() => onViewChange('expenses')} className="btn btn-primary">
          <span>Review Expense Queue</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Admin Stat Grid */}
      <div className="stat-grid">
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--info)' }}>
          <div className="stat-info">
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Submissions Today</span>
            <h3>{stats.todaySubmissions}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
            <Calendar size={22} />
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="stat-info">
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Pending Approvals</span>
            <h3>{stats.pendingApprovals}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Hourglass size={22} />
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-info">
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Approved this Month</span>
            <h3>{formatBDT(stats.approvedThisMonth)}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-info">
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Rejected this Month</span>
            <h3>{stats.rejectedThisMonth}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
            <XCircle size={22} />
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--primary)', gridColumn: 'span 2' }}>
          <div className="stat-info">
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Total Outstanding Owed (All Staff)</span>
            <h3>{formatBDT(stats.totalOutstanding)}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Coins size={22} />
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--success)', gridColumn: 'span 2' }}>
          <div className="stat-info">
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Total Paid this Month</span>
            <h3>{formatBDT(stats.totalPaidThisMonth)}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingDown size={22} />
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Category Share - Custom visual donut and list */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Approved Expenses by Category</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categoryBreakdown.length === 0 || categoryBreakdown.every(c => c.amount === 0) ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <Wallet size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>No approved expenses yet.</p>
              </div>
            ) : (
              <>
                {/* Horizontal Progress Bars representation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {categoryBreakdown.map((item, idx) => (
                    <div key={item.category.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        <span>{item.category.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {formatBDT(item.amount)} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${item.percentage}%`,
                          background: colors[idx % colors.length],
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Outstanding visual graph */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Outstanding Owed by Employee</h3>
          
          {ledger.length === 0 || ledger.every(l => l.balanceDue === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <Users size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>All employee accounts are fully cleared.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Stacked Ledger list bar graph */}
              {ledger.map((item, idx) => {
                const total = Math.max(...ledger.map(l => l.balanceDue));
                const barWidth = total > 0 ? (item.balanceDue / total) * 100 : 0;
                return (
                  <div key={item.employee.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '100px', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.employee.name}
                    </div>
                    <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 0.5rem', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${barWidth}%`,
                        background: 'linear-gradient(90deg, #65B2E8 0%, #3b82f6 100%)',
                        zIndex: 1,
                        borderRadius: '6px'
                      }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.balanceDue > 0 ? '#ffffff' : 'var(--text-secondary)', zIndex: 2, mixBlendMode: 'difference' }}>
                        {formatBDT(item.balanceDue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* THREE SIMPLE QUESTIONS: Main Financial Ledger */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--primary)" />
              <span>Employee Financial Ledger</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Answers the three core questions: 1. Spent, 2. Approved, and 3. Owed.
            </p>
          </div>

          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search employee..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.85rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Joined Date</th>
                <th>1. Spent (Submitted)</th>
                <th>2. Total Approved</th>
                <th>Total Paid</th>
                <th style={{ color: 'var(--primary)' }}>3. Money Still Owed</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map(item => (
                <tr key={item.employee.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.employee.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.employee.email}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {item.employee.dateJoined}
                  </td>
                  <td style={{ fontWeight: 500 }}>{formatBDT(item.totalSpent)}</td>
                  <td style={{ fontWeight: 500, color: 'var(--success)' }}>
                    {formatBDT(item.totalApproved)}
                  </td>
                  <td>{formatBDT(item.totalPaid)}</td>
                  <td style={{ fontWeight: 700, color: item.balanceDue > 0 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {formatBDT(item.balanceDue)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        // Pass parameters to record payments tab
                        localStorage.setItem('ne_pay_target_employee', item.employee.id);
                        onViewChange('payments');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                    >
                      Record Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
