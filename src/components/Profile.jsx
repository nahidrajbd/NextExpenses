import React, { useState, useContext } from 'react';
import { db } from '../db';
import { auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { AuthContext, ToastContext } from '../App';
import { User, Calendar, Phone, Mail, ShieldAlert, KeyRound } from 'lucide-react';

export default function Profile() {
  const { currentUser, refreshUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password should be at least 6 characters long.', 'error');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        // Re-authenticate user first
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Update password in Firebase Auth
        await updatePassword(user, newPassword);
        
        // Audit log
        await db.addLog(currentUser.id, 'Change Password', `Updated password for ${currentUser.name}`);
        showToast('Password updated successfully!', 'success');
        
        // Reset form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refreshUser();
      } else {
        showToast('No active authenticated session.', 'error');
      }
    } catch (err) {
      console.error(err);
      let friendlyMessage = 'Error updating password.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Current password is incorrect.';
      } else if (err.code === 'auth/requires-recent-login') {
        friendlyMessage = 'Security sensitive action. Please log out and log back in to retry.';
      }
      showToast(friendlyMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>My Profile</h2>
          <p>View your security credentials, role profile, and account status details.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Profile Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50px',
              backgroundColor: currentUser?.role === 'admin' ? 'var(--primary)' : 'var(--info)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.5rem',
              boxShadow: 'var(--shadow-md)'
            }}>
              {currentUser?.name.charAt(0)}
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem' }}>{currentUser?.name}</h3>
              <span className="badge" style={{
                backgroundColor: currentUser?.role === 'admin' ? 'var(--primary-light)' : 'var(--info-light)',
                color: currentUser?.role === 'admin' ? 'var(--primary)' : 'var(--info)',
                marginTop: '0.25rem'
              }}>
                {currentUser?.role}
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={18} className="text-muted" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Phone size={18} className="text-muted" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phone Contact</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.phone}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} className="text-muted" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date Joined</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.dateJoined}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldAlert size={18} className="text-muted" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Account Status</div>
                <span className="badge badge-approved" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                  {currentUser?.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} color="var(--primary)" />
            <span>Update Credentials</span>
          </h3>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="Min 4 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
