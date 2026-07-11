import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { AuthContext, ToastContext } from '../App';
import { Users, Plus, Edit, X, UserCheck, UserX, Key, Mail, Phone, Calendar, Trash } from 'lucide-react';

export default function EmployeesManager() {
  const { currentUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [employees, setEmployees] = useState([]);
  const [ledger, setLedger] = useState([]);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Active');
  const [dateJoined, setDateJoined] = useState(new Date().toISOString().split('T')[0]);
  const [role, setRole] = useState('employee');

  // Edit / Reset password states
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allUsers, ledgerData] = await Promise.all([
        db.getUsers(),
        db.getEmployeeLedger()
      ]);
      setEmployees(allUsers);
      setLedger(ledgerData);
    } catch (e) {
      console.error("Failed to load employee data", e);
      showToast('Failed to load employee list.', 'error');
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    try {
      // Check if email already exists
      const users = await db.getUsers();
      if (users.some(u => u.email === email.toLowerCase().trim())) {
        showToast('A user with this email already exists.', 'error');
        return;
      }

      await db.addUser({
        name,
        email,
        phone,
        password,
        status,
        role,
        dateJoined
      });

      await db.addLog(
        currentUser.id,
        'Create Employee',
        `Registered new user account (${role}): "${name}" (${email})`
      );

      showToast('User account created successfully!', 'success');
      setIsAddOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      showToast('Failed to register employee account.', 'error');
    }
  };

  const openEditModal = (emp) => {
    setSelectedEmp(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPhone(emp.phone);
    setStatus(emp.status);
    setDateJoined(emp.dateJoined);
    setRole(emp.role || 'employee');
    setNewPassword('');
    setIsEditOpen(true);
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;

    try {
      // Check if email already taken by someone else
      const users = await db.getUsers();
      if (users.some(u => u.id !== selectedEmp.id && u.email === email.toLowerCase().trim())) {
        showToast('Another user with this email already exists.', 'error');
        return;
      }

      const updatedData = {
        name,
        email,
        phone,
        status,
        role,
        dateJoined
      };

      if (newPassword.trim()) {
        updatedData.password = newPassword.trim();
      }

      await db.updateUser(selectedEmp.id, updatedData);
      await db.addLog(
        currentUser.id,
        'Update Employee',
        `Modified employee account details for "${name}"`
      );

      showToast('Employee details updated successfully.', 'success');
      setIsEditOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      showToast('Failed to update employee details.', 'error');
    }
  };

  const toggleStatus = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await db.updateUser(emp.id, { status: nextStatus });
      await db.addLog(
        currentUser.id,
        'Toggle Employee Status',
        `Set status of employee "${emp.name}" to ${nextStatus}`
      );
      showToast(`Employee ${emp.name} is now ${nextStatus}.`, 'info');
      await loadData();
    } catch (e) {
      showToast('Failed to update status.', 'error');
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (currentUser.id === emp.id) {
      showToast('You cannot delete your own admin account!', 'error');
      return;
    }

    if (confirm(`Are you sure you want to delete ${emp.name}'s account? This will permanently delete their profile document from Firestore. Note: If they have login credentials, you will still need to manually delete their Auth account in the Firebase Console.`)) {
      try {
        await db.deleteUser(emp.id);
        await db.addLog(
          currentUser.id,
          'Delete Employee',
          `Deleted user account profile: "${emp.name}" (${emp.email})`
        );
        showToast(`User ${emp.name} deleted successfully.`, 'success');
        await loadData();
      } catch (err) {
        showToast('Failed to delete user profile.', 'error');
      }
    }
  };

  const resetForm = () => {
    setSelectedEmp(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setStatus('Active');
    setRole('employee');
    setDateJoined(new Date().toISOString().split('T')[0]);
    setNewPassword('');
  };

  const getLedgerStats = (empId) => {
    const item = ledger.find(l => l.employee.id === empId);
    return item || { totalSpent: 0, totalApproved: 0, totalPaid: 0, balanceDue: 0 };
  };

  const formatBDT = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount).replace('BDT', '৳');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Manage Employees</h2>
          <p>Register new staff members, toggle active profiles, and review summaries.</p>
        </div>
        <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="btn btn-primary">
          <Plus size={18} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Employees Grid list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {employees.map(emp => {
          const stats = getLedgerStats(emp.id);
          const isActive = emp.status === 'Active';
          return (
            <div key={emp.id} className="glass-card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: `4px solid ${isActive ? 'var(--success)' : 'var(--danger)'}`,
              opacity: isActive ? 1 : 0.8
            }}>
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem' }}>{emp.name}</h3>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <span className="badge" style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem'
                      }}>
                        Joined: {emp.dateJoined}
                      </span>
                      <span className="badge" style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: emp.role === 'admin' ? 'var(--primary)' : 'var(--info)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {emp.role || 'employee'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span className={`badge ${isActive ? 'badge-approved' : 'badge-rejected'}`}>
                      {emp.status}
                    </span>
                    <button
                      onClick={() => handleDeleteEmployee(emp)}
                      className="btn-icon"
                      style={{
                        color: 'var(--danger)',
                        padding: '0.25rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title="Delete profile document"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>

                {/* Body Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} className="text-muted" />
                    <span>{emp.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} className="text-muted" />
                    <span>{emp.phone}</span>
                  </div>
                </div>

                {/* Mini Ledger */}
                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Approved Spent</div>
                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>{formatBDT(stats.totalApproved)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Money Owed</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{formatBDT(stats.balanceDue)}</div>
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.85rem',
                marginTop: '0.5rem'
              }}>
                <button
                  onClick={() => openEditModal(emp)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', gap: '0.25rem' }}
                >
                  <Edit size={14} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => toggleStatus(emp)}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    gap: '0.25rem',
                    backgroundColor: isActive ? 'var(--danger-light)' : 'var(--success-light)',
                    color: isActive ? 'var(--danger)' : 'var(--success)',
                    border: 'none'
                  }}
                >
                  {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                  <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- ADD EMPLOYEE DIALOG MODAL --- */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Register New Employee</h3>
              <button onClick={() => setIsAddOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nahid Raj"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="employee@company.com"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Contact *</label>
                    <input
                      type="text"
                      required
                      placeholder="+88017XXXXXXXX"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Login Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 4 characters"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joined Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={dateJoined}
                      onChange={(e) => setDateJoined(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Account Status</label>
                    <select
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">System Role</label>
                    <select
                      className="form-control"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT EMPLOYEE DIALOG MODAL --- */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Edit Employee Account</h3>
              <button onClick={() => setIsEditOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditEmployee}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Contact *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Reset Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current password"
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joined Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={dateJoined}
                      onChange={(e) => setDateJoined(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Account Status</label>
                    <select
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">System Role</label>
                    <select
                      className="form-control"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
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
    </div>
  );
}
