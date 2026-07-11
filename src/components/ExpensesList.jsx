import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { attachmentStore } from '../attachmentStore';
import { AuthContext, ToastContext } from '../App';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Paperclip,
  Calendar,
  X,
  FileText,
  Trash2,
  ChevronDown
} from 'lucide-react';

export default function ExpensesList({ employeeId = null }) {
  const { currentUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [usersLookup, setUsersLookup] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [rejectComment, setRejectComment] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  // Attachment preview state
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [loadingAttachment, setLoadingAttachment] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);

  useEffect(() => {
    loadFilterData();
    loadExpenses();
  }, [employeeId, statusFilter, categoryFilter, employeeFilter, dateRangeFilter, customStartDate, customEndDate, search]);

  const loadFilterData = async () => {
    try {
      const [cats, users] = await Promise.all([
        db.getCategories(),
        db.getUsers()
      ]);
      setCategories(cats);
      setUsersLookup(users);
      setEmployees(users.filter(u => u.role === 'employee'));
    } catch (e) {
      console.error("Failed to load filter data", e);
    }
  };

  const loadExpenses = async () => {
    let list = [];
    try {
      list = await db.getExpenses();
    } catch (e) {
      console.error("Failed to load expenses", e);
      return;
    }

    // 1. Employee Isolation (If employee views, they can only see their own)
    if (currentUser.role === 'employee') {
      list = list.filter(e => e.employeeId === currentUser.id);
    } else if (employeeFilter !== 'All') {
      // Admin filter by employee
      list = list.filter(e => e.employeeId === employeeFilter);
    }

    // 2. Status Filter
    if (statusFilter !== 'All') {
      list = list.filter(e => e.status === statusFilter);
    }

    // 3. Category Filter
    if (categoryFilter !== 'All') {
      list = list.filter(e => e.categoryId === categoryFilter);
    }

    // 4. Date Range Filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list = list.filter(e => {
      const eDate = new Date(e.date);
      eDate.setHours(0, 0, 0, 0);

      switch (dateRangeFilter) {
        case 'Today': {
          return eDate.getTime() === today.getTime();
        }
        case 'ThisWeek': {
          // Get Monday of current week
          const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
          const monday = new Date(today);
          monday.setDate(diff);
          
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          return eDate >= monday && eDate <= sunday;
        }
        case 'ThisMonth': {
          return eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
        }
        case 'LastMonth': {
          const lastMonth = new Date(today);
          lastMonth.setMonth(today.getMonth() - 1);
          return eDate.getMonth() === lastMonth.getMonth() && eDate.getFullYear() === lastMonth.getFullYear();
        }
        case 'Custom': {
          if (!customStartDate && !customEndDate) return true;
          if (customStartDate && !customEndDate) {
            return eDate >= new Date(customStartDate);
          }
          if (!customStartDate && customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return eDate <= end;
          }
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return eDate >= start && eDate <= end;
        }
        default:
          return true;
      }
    });

    // 5. Text Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(e => {
        const empName = getEmployeeName(e.employeeId).toLowerCase();
        const catName = getCategoryName(e.categoryId).toLowerCase();
        const desc = e.description.toLowerCase();
        const amt = e.amount.toString();
        const dateStr = e.date;

        return empName.includes(q) || catName.includes(q) || desc.includes(q) || amt.includes(q) || dateStr.includes(q);
      });
    }

    // Sort: latest expenses first
    setExpenses(list.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const getEmployeeName = (id) => {
    const emp = usersLookup.find(u => u.id === id);
    return emp ? emp.name : 'Unknown';
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  };

  const handleApprove = async (expense) => {
    if (expense.status !== 'Pending') return;

    if (confirm(`Approve this claim for ${formatBDT(expense.amount)} submitted by ${getEmployeeName(expense.employeeId)}?`)) {
      try {
        await db.updateExpense(expense.id, { status: 'Approved' });
        await db.addLog(currentUser.id, 'Approve Expense', `Approved expense ${expense.id} of ${expense.amount} BDT for ${getEmployeeName(expense.employeeId)}`);
        
        // Notify employee
        await db.addNotification(
          expense.employeeId,
          'Expense Approved',
          `Your expense claim for "${expense.description}" (${formatBDT(expense.amount)}) was approved.`
        );

        showToast('Expense claim approved.', 'success');
        await loadExpenses();
      } catch (e) {
        showToast('Failed to approve expense claim.', 'error');
      }
    }
  };

  const triggerReject = (expenseId) => {
    setRejectTargetId(expenseId);
    setRejectComment('');
    setIsRejectOpen(true);
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectComment.trim()) {
      showToast('Please provide a reason for rejection.', 'error');
      return;
    }

    try {
      const allExps = await db.getExpenses();
      const expense = allExps.find(ex => ex.id === rejectTargetId);
      if (!expense) return;

      await db.updateExpense(expense.id, {
        status: 'Rejected',
        rejectionComment: rejectComment.trim()
      });

      await db.addLog(
        currentUser.id,
        'Reject Expense',
        `Rejected expense ${expense.id} of ${expense.amount} BDT for ${getEmployeeName(expense.employeeId)}. Reason: ${rejectComment.trim()}`
      );

      // Notify employee
      await db.addNotification(
        expense.employeeId,
        'Expense Rejected',
        `Your expense claim for "${expense.description}" (${formatBDT(expense.amount)}) was rejected. Reason: ${rejectComment.trim()}`
      );

      showToast('Expense claim rejected.', 'info');
      setIsRejectOpen(false);
      await loadExpenses();
    } catch (err) {
      showToast('Failed to reject expense claim.', 'error');
    }
  };

  const handleViewAttachment = async (attachmentId) => {
    setLoadingAttachment(true);
    setIsAttachmentOpen(true);
    try {
      const data = await attachmentStore.getAttachment(attachmentId);
      setViewingAttachment(data);
    } catch (err) {
      showToast('Error opening attachment.', 'error');
      setIsAttachmentOpen(false);
    } finally {
      setLoadingAttachment(false);
    }
  };

  const formatBDT = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount).replace('BDT', '৳');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>{currentUser.role === 'admin' ? 'Expense Review Queue' : 'My Expense History'}</h2>
          <p>Search, filter, and review all office expense claims.</p>
        </div>
      </div>

      {/* Advanced Filter Bar Panel */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          {/* Text Search */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Search keyword</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Description, amount, date..."
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Claim Status</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Category</label>
            <select
              className="form-control"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Admin-only Employee Filter */}
          {currentUser.role === 'admin' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Submitted By</label>
              <select
                className="form-control"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="All">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range shortcut */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Date range</label>
            <select
              className="form-control"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="ThisWeek">This Week</option>
              <option value="ThisMonth">This Month</option>
              <option value="LastMonth">Last Month</option>
              <option value="Custom">Custom Range...</option>
            </select>
          </div>
        </div>

        {/* Custom date range picker drawer */}
        {dateRangeFilter === 'Custom' && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-end',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            animation: 'fadeIn var(--transition-fast)'
          }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label" style={{ fontSize: '0.65rem' }}>Start Date</label>
              <input
                type="date"
                className="form-control"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label" style={{ fontSize: '0.65rem' }}>End Date</label>
              <input
                type="date"
                className="form-control"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
              />
            </div>
            <button
              onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
              className="btn btn-secondary"
              style={{ padding: '0.5rem', fontSize: '0.8rem' }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Main Expenses Table */}
      <div className="glass-card">
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <Filter size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p>No claims match your current filter settings.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Showing {expenses.length} claims found
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    {currentUser.role === 'admin' && <th>Employee</th>}
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Invoice File</th>
                    <th>Status</th>
                    {currentUser.role === 'admin' && <th style={{ textAlign: 'right' }}>Approvals</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} className="text-muted" />
                          {exp.date}
                        </span>
                      </td>
                      {currentUser.role === 'admin' && (
                        <td style={{ fontWeight: 600 }}>{getEmployeeName(exp.employeeId)}</td>
                      )}
                      <td>
                        <span className="badge" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                          {getCategoryName(exp.categoryId)}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{exp.description}</div>
                          {exp.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {exp.notes}
                            </div>
                          )}
                          {exp.status === 'Rejected' && exp.rejectionComment && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--danger)',
                              backgroundColor: 'var(--danger-light)',
                              padding: '0.375rem 0.625rem',
                              borderRadius: '6px',
                              marginTop: '0.375rem',
                              borderLeft: '2px solid var(--danger)'
                            }}>
                              <strong>Rejection reason:</strong> {exp.rejectionComment}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatBDT(exp.amount)}</td>
                      <td>
                        {exp.attachmentId ? (
                          <button
                            onClick={() => handleViewAttachment(exp.attachmentId)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', gap: '0.25rem' }}
                          >
                            <Paperclip size={12} />
                            <span>View attachment</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No file</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${exp.status.toLowerCase()}`}>
                          {exp.status}
                        </span>
                      </td>
                      {currentUser.role === 'admin' && (
                        <td style={{ textAlign: 'right' }}>
                          {exp.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleApprove(exp)}
                                className="btn btn-icon"
                                title="Approve Claim"
                                style={{ color: 'var(--success)', padding: '0.375rem' }}
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => triggerReject(exp.id)}
                                className="btn btn-icon"
                                title="Reject Claim"
                                style={{ color: 'var(--danger)', padding: '0.375rem' }}
                              >
                                <XCircle size={18} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingRight: '0.5rem' }}>
                              Completed
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* --- REJECT COMMENT DIALOG MODAL --- */}
      {isRejectOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>Reject Expense Claim</h3>
              <button onClick={() => setIsRejectOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRejectConfirm}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reason for Rejection *</label>
                  <textarea
                    rows="4"
                    required
                    placeholder="Provide comments on why this claim is being rejected..."
                    className="form-control"
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    This reason will be visible to the employee on their dashboard.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsRejectOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ATTACHMENT VIEWER DIALOG --- */}
      {isAttachmentOpen && (
        <div className="modal-overlay" onClick={() => setIsAttachmentOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Document Attachment: {viewingAttachment ? viewingAttachment.name : 'Loading...'}
              </h3>
              <button onClick={() => setIsAttachmentOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', backgroundColor: '#1e293b', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              {loadingAttachment ? (
                <div style={{ color: '#ffffff' }}>Loading file data...</div>
              ) : viewingAttachment ? (
                viewingAttachment.type.startsWith('image/') ? (
                  <img
                    src={viewingAttachment.base64Data}
                    alt={viewingAttachment.name}
                    style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '4px' }}
                  />
                ) : viewingAttachment.type === 'application/pdf' ? (
                  <div style={{ color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <FileText size={64} color="var(--danger)" />
                    <p style={{ fontWeight: 600 }}>{viewingAttachment.name}</p>
                    <a
                      href={viewingAttachment.base64Data}
                      download={viewingAttachment.name}
                      className="btn btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      Download PDF Document
                    </a>
                    <iframe
                      src={viewingAttachment.base64Data}
                      title="PDF Preview"
                      style={{ width: '100%', height: '400px', border: 'none', marginTop: '1rem', borderRadius: '4px', backgroundColor: '#ffffff' }}
                    />
                  </div>
                ) : (
                  <div style={{ color: '#ffffff' }}>Unsupported file preview format.</div>
                )
              ) : (
                <div style={{ color: '#ffffff' }}>File failed to load or deleted.</div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '0.75rem 1.25rem' }}>
              {viewingAttachment && (
                <a
                  href={viewingAttachment.base64Data}
                  download={viewingAttachment.name}
                  className="btn btn-secondary"
                  style={{ textDecoration: 'none', marginRight: 'auto', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                >
                  Download File
                </a>
              )}
              <button onClick={() => setIsAttachmentOpen(false)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
