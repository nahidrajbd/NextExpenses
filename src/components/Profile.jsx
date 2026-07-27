import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { AuthContext, ToastContext } from '../App';
import { User, Calendar, Phone, Mail, ShieldAlert, KeyRound, MapPin, HeartHandshake, Save } from 'lucide-react';

export default function Profile() {
  const { currentUser, refreshUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // Profile Information form state
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [emergencyContactName, setEmergencyContactName] = useState(currentUser?.emergencyContactName || '');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(currentUser?.emergencyContactRelation || 'Guardian');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(currentUser?.emergencyContactPhone || '');
  const [presentAddress, setPresentAddress] = useState(currentUser?.presentAddress || '');
  const [permanentAddress, setPermanentAddress] = useState(currentUser?.permanentAddress || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || '');
      setEmergencyContactName(currentUser.emergencyContactName || '');
      setEmergencyContactRelation(currentUser.emergencyContactRelation || 'Guardian');
      setEmergencyContactPhone(currentUser.emergencyContactPhone || '');
      setPresentAddress(currentUser.presentAddress || '');
      setPermanentAddress(currentUser.permanentAddress || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await db.updateUser(currentUser.id, {
        phone,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        presentAddress,
        permanentAddress
      });
      await db.addLog(
        currentUser.id,
        'Update Profile Details',
        `Updated employee information (contact & addresses) for ${currentUser.name}`
      );
      await refreshUser();
      showToast('Profile information updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update profile details.', 'error');
    } finally {
      setSavingProfile(false);
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

        {/* Card 2: Update Personal Info & Emergency Contact & Addresses */}
        <div className="glass-card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <HeartHandshake size={20} color="#65B2E8" />
            <span>Employee Information</span>
          </h3>

          <form onSubmit={handleSaveProfile}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ color: '#0f172a', fontWeight: 600 }}>Primary Phone Contact *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#65B2E8' }} />
                <input
                  type="text"
                  required
                  className="form-control"
                  style={{ paddingLeft: '38px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                  placeholder="+8801700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Emergency Contact Header */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1.25rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                Emergency Contact Details
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#0f172a', fontSize: '0.8rem' }}>Relation *</label>
                  <select
                    className="form-control"
                    style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                    value={emergencyContactRelation}
                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                  >
                    <option value="Guardian">Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Relative">Relative</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ color: '#0f172a', fontSize: '0.8rem' }}>Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                    placeholder="Full name of contact"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#0f172a', fontSize: '0.8rem' }}>Emergency Contact Phone *</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#65B2E8' }} />
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ paddingLeft: '38px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                    placeholder="Phone number of emergency contact"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Address Details Header */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1.25rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} color="#65B2E8" /> Address Information
              </h4>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ color: '#0f172a', fontSize: '0.8rem' }}>Present Address *</label>
                <textarea
                  required
                  rows={2}
                  className="form-control"
                  style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', resize: 'vertical' }}
                  placeholder="House, Road, Area, City, Postal Code"
                  value={presentAddress}
                  onChange={(e) => setPresentAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#0f172a', fontSize: '0.8rem' }}>Permanent Address *</label>
                <textarea
                  required
                  rows={2}
                  className="form-control"
                  style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', resize: 'vertical' }}
                  placeholder="Village/House, Post Office, Upazila, District"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingProfile}
              style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#65B2E8', color: '#ffffff', boxShadow: '0 4px 14px rgba(101, 178, 232, 0.4)' }}
            >
              <Save size={18} />
              {savingProfile ? 'Saving Details...' : 'Save Profile Information'}
            </button>
          </form>
        </div>

        {/* Card 3: Change Password Card */}
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
      </div>
    </div>
  );
}
