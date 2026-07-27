import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { attachmentStore } from '../attachmentStore';
import { AuthContext, ToastContext } from '../App';
import {
  Coins,
  Receipt,
  Hourglass,
  XOctagon,
  ArrowDownCircle,
  Plus,
  Edit,
  Trash,
  Paperclip,
  Bell,
  Eye,
  Calendar,
  X,
  FileText
} from 'lucide-react';

export default function EmployeeDashboard({ onRefreshNotifs }) {
  const { currentUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allCategoriesLookup, setAllCategoriesLookup] = useState([]);
  
  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);

  // Form State
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Attachment Viewer
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [loadingAttachment, setLoadingAttachment] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;
    try {
      const [summaryData, allExpensesRaw, allPaymentsRaw, allCategories, notifs] = await Promise.all([
        db.getSingleEmployeeSummary(currentUser.id),
        db.getExpenses(),
        db.getPayments(),
        db.getCategories(),
        db.getNotifications(currentUser.id)
      ]);

      setSummary(summaryData);

      const empExpenses = allExpensesRaw.filter(e => e.employeeId === currentUser.id);
      setExpenses(empExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)));

      const empPayments = allPaymentsRaw.filter(p => p.employeeId === currentUser.id);
      setPayments(empPayments.sort((a, b) => new Date(b.date) - new Date(a.date)));

      setAllCategoriesLookup(allCategories);
      const activeCategories = allCategories.filter(c => c.active);
      setCategories(activeCategories);
      if (activeCategories.length > 0 && !categoryId) {
        setCategoryId(activeCategories[0].id);
      }

      setNotifications(notifs);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
      showToast('Error loading dashboard statistics.', 'error');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check file size (10 MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      showToast('File size exceeds the 10MB limit.', 'error');
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      showToast('Only JPG, PNG and PDF files are supported.', 'error');
      return;
    }

    setFile(selectedFile);

    // Create a local thumbnail preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview('pdf-placeholder');
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!date || !categoryId || !description || !amount) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (parseFloat(amount) <= 0) {
      showToast('Amount must be greater than zero.', 'error');
      return;
    }

    try {
      let attachmentId = null;
      if (file) {
        // Read file as base64 and save to IndexedDB
        const reader = new FileReader();
        attachmentId = await new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const fileId = await attachmentStore.saveAttachment(
                file.name,
                file.type,
                file.size,
                reader.result
              );
              resolve(fileId);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('FileReader error.'));
          reader.readAsDataURL(file);
        });
      }

      await db.addExpense({
        employeeId: currentUser.id,
        date,
        categoryId,
        description,
        amount,
        notes,
        attachmentId
      });

      await db.addLog(currentUser.id, 'Submit Expense', `Submitted expense for ${amount} BDT: "${description}"`);
      showToast('Expense submitted successfully!', 'success');
      resetForm();
      setIsSubmitOpen(false);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save file attachment. Try again.', 'error');
    }
  };

  const openEditModal = (expense) => {
    if (expense.status !== 'Pending') {
      showToast('You can only edit pending expenses.', 'error');
      return;
    }
    setSelectedExpense(expense);
    setDate(expense.date);
    setCategoryId(expense.categoryId);
    setDescription(expense.description);
    setAmount(expense.amount);
    setNotes(expense.notes || '');
    setFile(null);
    setFilePreview(expense.attachmentId ? 'existing' : null);
    setIsEditOpen(true);
  };

  const handleEditExpense = async (e) => {
    e.preventDefault();
    if (!selectedExpense) return;

    if (parseFloat(amount) <= 0) {
      showToast('Amount must be greater than zero.', 'error');
      return;
    }

    try {
      let attachmentId = selectedExpense.attachmentId;

      if (file) {
        // Delete old one if exists
        if (attachmentId) {
          await attachmentStore.deleteAttachment(attachmentId);
        }
        // Save new one
        const reader = new FileReader();
        attachmentId = await new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const fileId = await attachmentStore.saveAttachment(
                file.name,
                file.type,
                file.size,
                reader.result
              );
              resolve(fileId);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('FileReader error.'));
          reader.readAsDataURL(file);
        });
      } else if (filePreview === null && attachmentId) {
        // User removed the old file attachment
        await attachmentStore.deleteAttachment(attachmentId);
        attachmentId = null;
      }

      await db.updateExpense(selectedExpense.id, {
        date,
        categoryId,
        description,
        amount: parseFloat(amount),
        notes,
        attachmentId
      });

      await db.addLog(currentUser.id, 'Edit Expense', `Modified pending expense "${description}"`);
      showToast('Expense updated successfully!', 'success');
      resetForm();
      setIsEditOpen(false);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update expense. Try again.', 'error');
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (expense.status !== 'Pending') {
      showToast('You can only delete pending expenses.', 'error');
      return;
    }

    if (confirm('Are you sure you want to delete this expense submission?')) {
      if (expense.attachmentId) {
        await attachmentStore.deleteAttachment(expense.attachmentId);
      }
      await db.deleteExpense(expense.id);
      await db.addLog(currentUser.id, 'Delete Expense', `Deleted pending expense "${expense.description}"`);
      showToast('Expense deleted successfully.', 'info');
      await loadDashboardData();
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

  const markAllNotifications = async () => {
    await db.markNotificationsAsRead(currentUser.id);
    showToast('Notifications marked as read.', 'info');
    await loadDashboardData();
    if (onRefreshNotifs) onRefreshNotifs();
  };

  const resetForm = () => {
    setSelectedExpense(null);
    setDate(new Date().toISOString().split('T')[0]);
    if (categories.length > 0) setCategoryId(categories[0].id);
    setDescription('');
    setAmount('');
    setNotes('');
    setFile(null);
    setFilePreview(null);
  };

  const getCategoryName = (id) => {
    const cat = allCategoriesLookup.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  };

  const formatBDT = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount).replace('BDT', '৳');
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div>
      {/* Top Header Row */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Welcome back, {currentUser.name}!</h2>
          <p>Here is a summary of your office expenses and reimbursement claims.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setIsNotifOpen(true);
              if (onRefreshNotifs) onRefreshNotifs();
            }}
            className="btn btn-secondary"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            <span>Alerts</span>
            {unreadNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: 'var(--danger)',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadNotifications}
              </span>
            )}
          </button>
          <button onClick={() => { resetForm(); setIsSubmitOpen(true); }} className="btn btn-primary">
            <Plus size={18} />
            <span>Submit Expense</span>
          </button>
        </div>
      </div>

      {/* Balanced Statistics Cards */}
      {summary && (
        <div className="stat-grid">
          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div className="stat-info">
              <span className="form-label" style={{ fontSize: '0.75rem' }}>Outstanding Owed</span>
              <h3>{formatBDT(summary.balanceDue)}</h3>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Coins size={22} />
            </div>
          </div>

          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
            <div className="stat-info">
              <span className="form-label" style={{ fontSize: '0.75rem' }}>Approved Expenses</span>
              <h3>{formatBDT(summary.totalApproved)}</h3>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <Receipt size={22} />
            </div>
          </div>

          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
            <div className="stat-info">
              <span className="form-label" style={{ fontSize: '0.75rem' }}>Pending Claims</span>
              <h3>{formatBDT(summary.totalPending)}</h3>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
              <Hourglass size={22} />
            </div>
          </div>

          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="stat-info">
              <span className="form-label" style={{ fontSize: '0.75rem' }}>Rejected Claims</span>
              <h3>{formatBDT(summary.totalRejected)}</h3>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              <XOctagon size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Last Payment Card */}
      {summary?.lastPayment && (
        <div className="glass-card" style={{
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          background: 'var(--success-light)',
          borderColor: 'var(--success)'
        }}>
          <div style={{
            backgroundColor: 'var(--success)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Last Payment Received
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{formatBDT(summary.lastPayment.amount)}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>on {summary.lastPayment.date}</span>
            </div>
            {summary.lastPayment.notes && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                Note: "{summary.lastPayment.notes}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity Expenses Table */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={20} color="var(--primary)" />
          <span>Recent Expenses</span>
        </h3>

        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <Receipt size={40} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <p>No expenses submitted yet.</p>
            <button onClick={() => setIsSubmitOpen(true)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Plus size={16} /> Submit Your First Expense
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Attachment</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 10).map(exp => (
                  <tr key={exp.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} className="text-muted" />
                        {exp.date}
                      </span>
                    </td>
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
                            <strong>Reason:</strong> {exp.rejectionComment}
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
                          <span>View file</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${exp.status.toLowerCase()}`}>
                        {exp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        {exp.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => openEditModal(exp)}
                              className="btn btn-icon"
                              title="Edit Claim"
                              style={{ padding: '0.375rem' }}
                            >
                              <Edit size={16} color="var(--primary)" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp)}
                              className="btn btn-icon"
                              title="Delete Claim"
                              style={{ padding: '0.375rem' }}
                            >
                              <Trash size={16} color="var(--danger)" />
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- FORM SUBMIT EXPENSE DIALOG MODAL --- */}
      {isSubmitOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Submit Expense Claim</h3>
              <button onClick={() => setIsSubmitOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Expense Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-control"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Claim Amount (BDT) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 1500"
                    className="form-control"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Purpose *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client lunch at Radisson"
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    rows="2"
                    placeholder="Add extra comments or project references..."
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice Attachment (Optional, Max 10MB)</label>
                  <div className="file-upload-drag" style={{ position: 'relative' }}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <Paperclip size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Drag file here or click to choose</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Supports JPG, PNG or PDF (up to 10MB)
                    </p>
                  </div>
                  {file && (
                    <div className="file-preview-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        {file.type.startsWith('image/') ? (
                          <img src={filePreview} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                        ) : (
                          <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.5rem', borderRadius: '6px' }}>
                            <FileText size={20} />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setFile(null); setFilePreview(null); }} className="btn-icon" style={{ padding: '0.25rem' }}>
                        <X size={16} color="var(--danger)" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsSubmitOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FORM EDIT EXPENSE DIALOG MODAL --- */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Edit Expense Claim</h3>
              <button onClick={() => setIsEditOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditExpense}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Expense Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-control"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Claim Amount (BDT) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="form-control"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Purpose *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Attachment (Optional)</label>
                  {filePreview === 'existing' ? (
                    <div className="file-preview-card" style={{ borderColor: 'var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Paperclip size={18} color="var(--primary)" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>File Attachment exists</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button type="button" onClick={() => handleViewAttachment(selectedExpense.attachmentId)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                          View
                        </button>
                        <button type="button" onClick={() => { setFilePreview(null); }} className="btn btn-icon" style={{ padding: '0.25rem' }}>
                          <X size={16} color="var(--danger)" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="file-upload-drag" style={{ position: 'relative' }}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer'
                          }}
                        />
                        <Paperclip size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Drag file here or click to choose</p>
                      </div>
                      {file && (
                        <div className="file-preview-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                            {file.type.startsWith('image/') ? (
                              <img src={filePreview} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                            ) : (
                              <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.5rem', borderRadius: '6px' }}>
                                <FileText size={20} />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                          </div>
                          <button type="button" onClick={() => { setFile(null); setFilePreview(null); }} className="btn-icon" style={{ padding: '0.25rem' }}>
                            <X size={16} color="var(--danger)" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NOTIFICATIONS SLIDE DRAWER --- */}
      {isNotifOpen && (
        <div className="modal-overlay" onClick={() => setIsNotifOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100vh',
            maxWidth: '400px',
            borderRadius: 0,
            animation: 'slideInRight var(--transition-fast)'
          }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={20} color="var(--primary)" />
                <span>Inbox Alerts</span>
              </h3>
              <button onClick={() => setIsNotifOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', padding: '1rem' }}>
              {notifications.length > 0 && (
                <button
                  onClick={markAllNotifications}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginBottom: '1rem', fontSize: '0.8rem', padding: '0.5rem' }}
                >
                  Mark all as read
                </button>
              )}

              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  <Bell size={30} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                  <p>You have no notifications yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: notif.read ? 'transparent' : 'var(--primary-light)',
                        borderLeft: notif.read ? '1px solid var(--border-color)' : '3px solid var(--primary)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {new Date(notif.date).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                      <Plus size={16} /> Download PDF Document
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
