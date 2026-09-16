import React, { useState, useEffect, useContext, useRef } from 'react';
import { db } from '../db';
import { AuthContext, ToastContext } from '../App';
import { resizeImageToDataURL } from '../utils/photo';
import {
  generateAppointmentLetter,
  generateNOCLetter,
  generateExperienceLetter,
  generateIDCard,
  generateVisitingCard
} from '../utils/documentGenerator';
import {
  Users, Plus, Edit, X, UserCheck, UserX, Mail, Phone, Trash, ArrowLeft,
  Search, Camera, FileText, IdCard, CreditCard, FileCheck, FileSignature, Briefcase
} from 'lucide-react';
import { getEmployeeStatus, STATUS_COLORS } from '../utils/schedule';

const EMPTY_PROFILE = {
  name: '', email: '', phone: '', password: '', status: 'Active',
  dateJoined: new Date().toISOString().split('T')[0], role: 'employee',
  emergencyContactName: '', emergencyContactRelation: 'Guardian', emergencyContactPhone: '',
  presentAddress: '', permanentAddress: '',
  photoURL: '', employeeCode: '', designation: '', department: '',
  dateOfBirth: '', gender: '', bloodGroup: '', nationalId: '',
  fatherName: '', motherName: '', maritalStatus: '', education: '',
  employmentType: 'Full-Time', salary: '', newPassword: ''
};

export default function EmployeesManager() {
  const { currentUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const fileInputRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [search, setSearch] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null); // detail view
  const [detailTab, setDetailTab] = useState('overview');
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [, setTick] = useState(0); // forces re-render so live status badges stay current

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [allUsers, ledgerData] = await Promise.all([db.getUsers(), db.getEmployeeLedger()]);
      setEmployees(allUsers);
      setLedger(ledgerData);
      if (selectedEmp) {
        const fresh = allUsers.find(u => u.id === selectedEmp.id);
        if (fresh) setSelectedEmp(fresh);
      }
    } catch (e) {
      console.error('Failed to load employee data', e);
      showToast('Failed to load employee list.', 'error');
    }
  };

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataURL(file, 300, 0.85);
      setField('photoURL', dataUrl);
      setPhotoPreview(dataUrl);
    } catch (err) {
      showToast(err.message || 'Failed to process photo.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openAddModal = () => {
    setForm(EMPTY_PROFILE);
    setPhotoPreview('');
    setIsAddOpen(true);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    try {
      const users = await db.getUsers();
      if (users.some(u => u.email === form.email.toLowerCase().trim())) {
        showToast('A user with this email already exists.', 'error');
        return;
      }
      await db.addUser(form);
      await db.addLog(currentUser.id, 'Create Employee', `Registered new user account (${form.role}): "${form.name}" (${form.email})`);
      showToast('User account created successfully!', 'success');
      setIsAddOpen(false);
      setForm(EMPTY_PROFILE);
      await loadData();
    } catch (err) {
      showToast('Failed to register employee account.', 'error');
    }
  };

  const openDetail = (emp) => {
    setSelectedEmp(emp);
    setForm({ ...EMPTY_PROFILE, ...emp, newPassword: '' });
    setPhotoPreview(emp.photoURL || '');
    setDetailTab('overview');
  };

  const closeDetail = () => {
    setSelectedEmp(null);
    setForm(EMPTY_PROFILE);
    setPhotoPreview('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      const users = await db.getUsers();
      if (users.some(u => u.id !== selectedEmp.id && u.email === form.email.toLowerCase().trim())) {
        showToast('Another user with this email already exists.', 'error');
        return;
      }

      const updatedData = { ...form };
      delete updatedData.newPassword;
      delete updatedData.password;
      if (form.newPassword?.trim()) updatedData.password = form.newPassword.trim();

      const saved = await db.updateUser(selectedEmp.id, updatedData);
      await db.addLog(currentUser.id, 'Update Employee', `Modified employee profile for "${form.name}"`);
      showToast('Employee profile updated successfully.', 'success');
      setSelectedEmp(saved);
      setDetailTab('overview');
      await loadData();
    } catch (err) {
      showToast('Failed to update employee details.', 'error');
    }
  };

  const toggleStatus = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await db.updateUser(emp.id, { status: nextStatus });
      await db.addLog(currentUser.id, 'Toggle Employee Status', `Set status of employee "${emp.name}" to ${nextStatus}`);
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
    if (confirm(`Are you sure you want to delete ${emp.name}'s account? This will permanently delete their profile document from Firestore.`)) {
      try {
        await db.deleteUser(emp.id);
        await db.addLog(currentUser.id, 'Delete Employee', `Deleted user account profile: "${emp.name}" (${emp.email})`);
        showToast(`User ${emp.name} deleted successfully.`, 'success');
        if (selectedEmp?.id === emp.id) closeDetail();
        await loadData();
      } catch (err) {
        showToast('Failed to delete user profile.', 'error');
      }
    }
  };

  const getLedgerStats = (empId) => {
    const item = ledger.find(l => l.employee.id === empId);
    return item || { totalSpent: 0, totalApproved: 0, totalPaid: 0, balanceDue: 0 };
  };

  const formatBDT = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0).replace('BDT', '৳');

  const runDocGen = (fn, emp) => {
    try {
      fn(emp);
      showToast('Document generated. Check your downloads.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate document.', 'error');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [emp.name, emp.email, emp.designation, emp.department, emp.employeeCode]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
  });

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
        alignItems: 'center', justifyContent: 'center', fontWeight: 700,
        fontSize: size * 0.4
      }}>
        {emp.name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    )
  );

  // ---------- DETAIL VIEW ----------
  if (selectedEmp) {
    const stats = getLedgerStats(selectedEmp.id);
    const isActive = selectedEmp.status === 'Active';
    const liveStatus = getEmployeeStatus(selectedEmp);

    return (
      <div>
        <div className="page-header">
          <div className="page-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={closeDetail} className="btn-icon" title="Back to employee list">
              <ArrowLeft size={20} />
            </button>
            <Avatar emp={selectedEmp} size={48} />
            <div>
              <h2 style={{ marginBottom: 0 }}>{selectedEmp.name}</h2>
              <p style={{ margin: 0 }}>{selectedEmp.designation || 'Staff Member'} {selectedEmp.department ? `• ${selectedEmp.department}` : ''}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge" style={{
              alignSelf: 'center', backgroundColor: `${STATUS_COLORS[liveStatus.status]}20`,
              color: STATUS_COLORS[liveStatus.status], display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: STATUS_COLORS[liveStatus.status], display: 'inline-block' }} />
              {liveStatus.label}
            </span>
            <span className={`badge ${isActive ? 'badge-approved' : 'badge-rejected'}`} style={{ alignSelf: 'center' }}>
              {selectedEmp.status}
            </span>
            <button onClick={() => toggleStatus(selectedEmp)} className="btn btn-secondary">
              {isActive ? <UserX size={16} /> : <UserCheck size={16} />}
              <span>{isActive ? 'Deactivate' : 'Activate'}</span>
            </button>
            <button onClick={() => handleDeleteEmployee(selectedEmp)} className="btn" style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              <Trash size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="tab-container">
          <button className={`tab-btn ${detailTab === 'overview' ? 'active' : ''}`} onClick={() => setDetailTab('overview')}>Overview</button>
          <button className={`tab-btn ${detailTab === 'edit' ? 'active' : ''}`} onClick={() => setDetailTab('edit')}>Edit Profile</button>
          <button className={`tab-btn ${detailTab === 'documents' ? 'active' : ''}`} onClick={() => setDetailTab('documents')}>Documents</button>
        </div>

        {detailTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>Contact & Personal</h4>
              <OverviewRow label="Employee ID" value={selectedEmp.employeeCode || 'N/A'} />
              <OverviewRow label="Email" value={selectedEmp.email} />
              <OverviewRow label="Phone" value={selectedEmp.phone} />
              <OverviewRow label="Date of Birth" value={selectedEmp.dateOfBirth || 'N/A'} />
              <OverviewRow label="Gender" value={selectedEmp.gender || 'N/A'} />
              <OverviewRow label="Blood Group" value={selectedEmp.bloodGroup || 'N/A'} />
              <OverviewRow label="Marital Status" value={selectedEmp.maritalStatus || 'N/A'} />
              <OverviewRow label="National ID" value={selectedEmp.nationalId || 'N/A'} />
            </div>

            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>Employment</h4>
              <OverviewRow label="Designation" value={selectedEmp.designation || 'N/A'} />
              <OverviewRow label="Department" value={selectedEmp.department || 'N/A'} />
              <OverviewRow label="Employment Type" value={selectedEmp.employmentType || 'N/A'} />
              <OverviewRow label="Joined" value={selectedEmp.dateJoined} />
              <OverviewRow label="System Role" value={selectedEmp.role} />
              <OverviewRow label="Education" value={selectedEmp.education || 'N/A'} />
            </div>

            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>Emergency & Family</h4>
              <OverviewRow label="Father's Name" value={selectedEmp.fatherName || 'N/A'} />
              <OverviewRow label="Mother's Name" value={selectedEmp.motherName || 'N/A'} />
              <OverviewRow label={`Emergency (${selectedEmp.emergencyContactRelation || 'Guardian'})`} value={selectedEmp.emergencyContactName || 'N/A'} />
              <OverviewRow label="Emergency Phone" value={selectedEmp.emergencyContactPhone || 'N/A'} />
            </div>

            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>Address</h4>
              <OverviewRow label="Present Address" value={selectedEmp.presentAddress || 'N/A'} />
              <OverviewRow label="Permanent Address" value={selectedEmp.permanentAddress || 'N/A'} />
            </div>

            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>Expense Ledger Summary</h4>
              <OverviewRow label="Approved Spent" value={formatBDT(stats.totalApproved)} />
              <OverviewRow label="Total Paid" value={formatBDT(stats.totalPaid)} />
              <OverviewRow label="Balance Due" value={formatBDT(stats.balanceDue)} />
            </div>
          </div>
        )}

        {detailTab === 'edit' && (
          <form onSubmit={handleSaveProfile} className="glass-card">
            <ProfileFormFields
              form={form}
              setField={setField}
              photoPreview={photoPreview}
              uploadingPhoto={uploadingPhoto}
              handlePhotoChange={handlePhotoChange}
              fileInputRef={fileInputRef}
              isEdit
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button type="button" onClick={() => setDetailTab('overview')} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        )}

        {detailTab === 'documents' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <DocCard
              icon={<FileSignature size={22} />}
              title="Appointment Letter"
              desc="Official letter confirming the employee's role and joining terms."
              onClick={() => runDocGen(generateAppointmentLetter, selectedEmp)}
            />
            <DocCard
              icon={<FileCheck size={22} />}
              title="No Objection Certificate"
              desc="NOC for visa applications, travel, or personal matters."
              onClick={() => runDocGen(generateNOCLetter, selectedEmp)}
            />
            <DocCard
              icon={<FileText size={22} />}
              title="Experience Certificate"
              desc="Certifies tenure, role, and conduct during employment."
              onClick={() => runDocGen(generateExperienceLetter, selectedEmp)}
            />
            <DocCard
              icon={<IdCard size={22} />}
              title="Employee ID Card"
              desc="Printable CR80-size photo ID card with employee details."
              onClick={() => runDocGen(generateIDCard, selectedEmp)}
            />
            <DocCard
              icon={<CreditCard size={22} />}
              title="Visiting Card"
              desc="Standard business/visiting card with contact details."
              onClick={() => runDocGen(generateVisitingCard, selectedEmp)}
            />
          </div>
        )}
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Manage Employees</h2>
          <p>HR directory — view profiles, manage staff records, and issue official documents.</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} className="text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, designation, department, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {filteredEmployees.map(emp => {
          const stats = getLedgerStats(emp.id);
          const isActive = emp.status === 'Active';
          const liveStatus = getEmployeeStatus(emp);
          return (
            <div
              key={emp.id}
              className="glass-card"
              onClick={() => openDetail(emp)}
              style={{
                cursor: 'pointer',
                borderLeft: `4px solid ${isActive ? 'var(--success)' : 'var(--danger)'}`,
                opacity: isActive ? 1 : 0.8,
                transition: 'transform 0.15s'
              }}
            >
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar emp={emp} size={52} />
                  <span title={liveStatus.label} style={{
                    position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: '50%',
                    backgroundColor: STATUS_COLORS[liveStatus.status], border: '2px solid var(--bg-secondary)'
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Briefcase size={12} />
                    <span>{emp.designation || 'Staff Member'}{emp.department ? ` • ${emp.department}` : ''}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: STATUS_COLORS[liveStatus.status], fontWeight: 600, marginTop: '0.15rem' }}>
                    {liveStatus.label}
                  </div>
                </div>
                <span className={`badge ${isActive ? 'badge-approved' : 'badge-rejected'}`}>{emp.status}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={13} className="text-muted" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={13} className="text-muted" />
                  <span>{emp.phone}</span>
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '0.65rem',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem',
                border: '1px solid var(--border-color)', marginBottom: '0.9rem'
              }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Approved Spent</div>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>{formatBDT(stats.totalApproved)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Money Owed</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatBDT(stats.balanceDue)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button onClick={(e) => { e.stopPropagation(); openDetail(emp); }} className="btn btn-secondary" style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', gap: '0.25rem' }}>
                  <Edit size={13} />
                  <span>View / Edit Profile</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp); }}
                  className="btn-icon"
                  style={{ color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: 'none', borderRadius: '6px' }}
                  title="Delete profile"
                >
                  <Trash size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {filteredEmployees.length === 0 && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
            <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>No employees found.</p>
          </div>
        )}
      </div>

      {/* --- ADD EMPLOYEE MODAL --- */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Register New Employee</h3>
              <button onClick={() => setIsAddOpen(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-body">
                <ProfileFormFields
                  form={form}
                  setField={setField}
                  photoPreview={photoPreview}
                  uploadingPhoto={uploadingPhoto}
                  handlePhotoChange={handlePhotoChange}
                  fileInputRef={fileInputRef}
                  isEdit={false}
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Register Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function DocCard({ icon, title, desc, onClick }) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '10px', backgroundColor: 'rgba(101, 178, 232, 0.12)',
        color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{ marginBottom: '0.25rem' }}>{title}</h4>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>{desc}</p>
      </div>
      <button onClick={onClick} className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
        <FileText size={15} />
        <span>Generate PDF</span>
      </button>
    </div>
  );
}

function ProfileFormFields({ form, setField, photoPreview, uploadingPhoto, handlePhotoChange, fileInputRef, isEdit }) {
  return (
    <>
      {/* Photo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: 100, height: 100, borderRadius: '12px', overflow: 'hidden',
          border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: 'var(--bg-primary)', flexShrink: 0
        }}>
          {photoPreview ? (
            <img src={photoPreview} alt="Employee" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Camera size={28} className="text-muted" />
          )}
        </div>
        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Profile Photo (300 × 300)</label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
            id="employee-photo-input"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? 'Processing...' : 'Upload Photo'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Image will be auto-cropped and resized to a 300×300 square.
          </p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <input type="text" required placeholder="e.g. Nahid Raj" className="form-control" value={form.name} onChange={(e) => setField('name', e.target.value)} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email Address *</label>
          <input type="email" required placeholder="employee@company.com" className="form-control" value={form.email} onChange={(e) => setField('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone Contact *</label>
          <input type="text" required placeholder="+88017XXXXXXXX" className="form-control" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        {!isEdit ? (
          <div className="form-group">
            <label className="form-label">Login Password *</label>
            <input type="password" required placeholder="Min 4 characters" className="form-control" value={form.password} onChange={(e) => setField('password', e.target.value)} />
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Reset Password (Optional)</label>
            <input type="password" placeholder="Leave blank to keep current password" className="form-control" value={form.newPassword} onChange={(e) => setField('newPassword', e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Joined Date *</label>
          <input type="date" required className="form-control" value={form.dateJoined} onChange={(e) => setField('dateJoined', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Account Status</label>
          <select className="form-control" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">System Role</label>
          <select className="form-control" value={form.role} onChange={(e) => setField('role', e.target.value)}>
            <option value="employee">Employee</option>
            <option value="admin">System Admin</option>
          </select>
        </div>
      </div>

      {/* Employment Details */}
      <div style={{ borderTop: '1px solid rgba(152, 152, 154, 0.3)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Employment Details</h4>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employee ID</label>
            <input type="text" placeholder="e.g. EMP-1024" className="form-control" value={form.employeeCode} onChange={(e) => setField('employeeCode', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input type="text" placeholder="e.g. Senior Executive" className="form-control" value={form.designation} onChange={(e) => setField('designation', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Department</label>
            <input type="text" placeholder="e.g. Finance" className="form-control" value={form.department} onChange={(e) => setField('department', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Employment Type</label>
            <select className="form-control" value={form.employmentType} onChange={(e) => setField('employmentType', e.target.value)}>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contractual">Contractual</option>
              <option value="Intern">Intern</option>
            </select>
          </div>
        </div>
      </div>

      {/* Personal Details */}
      <div style={{ borderTop: '1px solid rgba(152, 152, 154, 0.3)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Personal Details</h4>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input type="date" className="form-control" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-control" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Blood Group</label>
            <select className="form-control" value={form.bloodGroup} onChange={(e) => setField('bloodGroup', e.target.value)}>
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Marital Status</label>
            <select className="form-control" value={form.maritalStatus} onChange={(e) => setField('maritalStatus', e.target.value)}>
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">National ID / NID</label>
            <input type="text" className="form-control" value={form.nationalId} onChange={(e) => setField('nationalId', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Education</label>
            <input type="text" placeholder="e.g. BBA, Dhaka University" className="form-control" value={form.education} onChange={(e) => setField('education', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Father's Name</label>
            <input type="text" className="form-control" value={form.fatherName} onChange={(e) => setField('fatherName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mother's Name</label>
            <input type="text" className="form-control" value={form.motherName} onChange={(e) => setField('motherName', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div style={{ borderTop: '1px solid rgba(152, 152, 154, 0.3)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Emergency Contact</h4>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Relation</label>
            <select className="form-control" value={form.emergencyContactRelation} onChange={(e) => setField('emergencyContactRelation', e.target.value)}>
              <option value="Guardian">Guardian</option>
              <option value="Sibling">Sibling</option>
              <option value="Spouse">Spouse</option>
              <option value="Parent">Parent</option>
              <option value="Relative">Relative</option>
              <option value="Friend">Friend</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contact Person Name</label>
            <input type="text" className="form-control" value={form.emergencyContactName} onChange={(e) => setField('emergencyContactName', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Emergency Phone Number</label>
          <input type="text" placeholder="+88017XXXXXXXX" className="form-control" value={form.emergencyContactPhone} onChange={(e) => setField('emergencyContactPhone', e.target.value)} />
        </div>
      </div>

      {/* Address */}
      <div style={{ borderTop: '1px solid rgba(152, 152, 154, 0.3)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Address Information</h4>
        <div className="form-group">
          <label className="form-label">Present Address</label>
          <input type="text" className="form-control" value={form.presentAddress} onChange={(e) => setField('presentAddress', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Permanent Address</label>
          <input type="text" className="form-control" value={form.permanentAddress} onChange={(e) => setField('permanentAddress', e.target.value)} />
        </div>
      </div>
    </>
  );
}
