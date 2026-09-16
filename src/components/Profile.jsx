import React, { useState, useContext } from 'react';
import { db } from '../db';
import { auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider, linkWithPopup, unlink } from 'firebase/auth';
import { AuthContext, ToastContext } from '../App';
import { User, Calendar, Mail, ShieldAlert, KeyRound, Link2, Unlink } from 'lucide-react';

export default function Profile() {
  const { currentUser, refreshUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Linked Google account state
  const [, forceRerender] = useState(0);
  const isGoogleLinked = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com') || false;
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      await db.addLog(currentUser.id, 'Link Google Account', `${currentUser.name} linked their Google account.`);
      showToast('Google account linked! You can now sign in with Google too.', 'success');
      forceRerender(t => t + 1);
    } catch (err) {
      console.error(err);
      let friendlyMessage = 'Failed to link Google account.';
      if (err.code === 'auth/credential-already-in-use') {
        friendlyMessage = 'This Google account is already linked to another user.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Google linking was cancelled.';
      } else if (err.code === 'auth/popup-blocked') {
        friendlyMessage = 'Your browser blocked the popup. Please allow popups and try again.';
      }
      showToast(friendlyMessage, 'error');
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm('Unlink your Google account? You will only be able to sign in with your email and password afterward.')) return;
    setLinkingGoogle(true);
    try {
      await unlink(auth.currentUser, 'google.com');
      await db.addLog(currentUser.id, 'Unlink Google Account', `${currentUser.name} unlinked their Google account.`);
      showToast('Google account unlinked.', 'info');
      forceRerender(t => t + 1);
    } catch (err) {
      console.error(err);
      showToast('Failed to unlink Google account.', 'error');
    } finally {
      setLinkingGoogle(false);
    }
  };

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
          <p>Update your personal employee information, emergency contact, addresses, and account security.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Card 1: Account Overview */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50px',
              backgroundColor: '#65B2E8',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.5rem',
              boxShadow: '0 4px 14px rgba(101, 178, 232, 0.4)'
            }}>
              {currentUser?.name?.charAt(0)}
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: '#0f172a' }}>{currentUser?.name}</h3>
              <span className="badge" style={{
                backgroundColor: 'rgba(101, 178, 232, 0.15)',
                color: '#65B2E8',
                marginTop: '0.25rem',
                border: '1px solid #65B2E8',
                fontWeight: 700
              }}>
                {currentUser?.role}
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={18} style={{ color: '#65B2E8' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Email Address</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#0f172a' }}>{currentUser?.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} style={{ color: '#65B2E8' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Date Joined</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#0f172a' }}>{currentUser?.dateJoined}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldAlert size={18} style={{ color: '#65B2E8' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Account Status</div>
                <span className="badge badge-approved" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                  {currentUser?.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Change Password Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <KeyRound size={20} color="#65B2E8" />
            <span>Update Credentials</span>
          </h3>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#0f172a' }}>Current Password *</label>
              <input
                type="password"
                required
                className="form-control"
                style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#0f172a' }}>New Password *</label>
              <input
                type="password"
                required
                className="form-control"
                style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#0f172a' }}>Confirm New Password *</label>
              <input
                type="password"
                required
                className="form-control"
                style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.5rem', background: '#65B2E8', color: '#ffffff', boxShadow: '0 4px 14px rgba(101, 178, 232, 0.4)' }}>
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Card 3: Linked Accounts Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <Link2 size={20} color="#65B2E8" />
            <span>Linked Accounts</span>
          </h3>

          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.4 }}>
            Link your Google account to sign in faster next time, without typing your password. Your email and password login always keeps working.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
            padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Google</div>
                <div style={{ fontSize: '0.75rem', color: isGoogleLinked ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                  {isGoogleLinked ? 'Linked' : 'Not linked'}
                </div>
              </div>
            </div>

            {isGoogleLinked ? (
              <button
                type="button"
                onClick={handleUnlinkGoogle}
                disabled={linkingGoogle}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', gap: '0.4rem', color: 'var(--danger)' }}
              >
                <Unlink size={14} />
                <span>Unlink</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', gap: '0.4rem' }}
              >
                <Link2 size={14} />
                <span>{linkingGoogle ? 'Linking...' : 'Link Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
