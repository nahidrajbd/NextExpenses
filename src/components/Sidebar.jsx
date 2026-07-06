import React, { useState, useContext } from 'react';
import { AuthContext, ThemeContext } from '../App';
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Coins,
  FileText,
  History,
  User,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bell,
  Users
} from 'lucide-react';

export default function Sidebar({ currentView, onViewChange, notificationsCount, onRefreshNotifs }) {
  const { currentUser, logout } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = currentUser?.role === 'admin'
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'expenses', label: 'Review Expenses', icon: Receipt },
        { id: 'employees', label: 'Manage Employees', icon: Users },
        { id: 'categories', label: 'Categories Manager', icon: Tags },
        { id: 'payments', label: 'Record Payments', icon: Coins },
        { id: 'reports', label: 'Reports Module', icon: FileText },
        { id: 'logs', label: 'Audit Logs', icon: History },
        { id: 'profile', label: 'My Profile', icon: User }
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'expenses', label: 'Expense History', icon: Receipt },
        { id: 'profile', label: 'My Profile', icon: User }
      ];

  const handleNav = (viewId) => {
    onViewChange(viewId);
    setMobileOpen(false);
    if (onRefreshNotifs) onRefreshNotifs();
  };

  const navStyles = {
    sidebar: {
      width: '260px',
      backgroundColor: 'var(--bg-sidebar)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      position: 'relative',
      zIndex: 90,
      transition: 'transform var(--transition-normal)',
      flexShrink: 0
    },
    mobileBar: {
      display: 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '60px',
      backgroundColor: 'var(--bg-sidebar)',
      color: '#ffffff',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      zIndex: 95,
      boxShadow: 'var(--shadow-sm)'
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="mobile-bar-element" style={navStyles.mobileBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Coins size={22} color="#6366f1" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>NextExpenses</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={toggleTheme} className="btn-icon" style={{ color: '#ffffff' }}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-icon" style={{ color: '#ffffff' }}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Nav */}
      <aside
        className={`sidebar-nav-container ${mobileOpen ? 'mobile-show' : ''}`}
        style={{
          ...navStyles.sidebar
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
          }}>
            <Coins size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ color: '#ffffff', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
              NextExpenses
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {currentUser?.role === 'admin' ? 'Admin Portal' : 'Employee Desk'}
            </span>
          </div>
        </div>

        {/* User Card */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '0.875rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50px',
            backgroundColor: currentUser?.role === 'admin' ? 'var(--primary)' : 'var(--info)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            {currentUser?.name.charAt(0)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.email}
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, var(--primary), var(--primary-hover))' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all var(--transition-fast)'
                }}
                className={isActive ? '' : 'sidebar-item-hover'}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.id === 'dashboard' && currentUser?.role === 'employee' && notificationsCount > 0 && (
                  <span style={{
                    backgroundColor: 'var(--danger)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.125rem 0.375rem',
                    borderRadius: '50px',
                    lineHeight: 1
                  }}>
                    {notificationsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
            className="sidebar-item-hover"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Log out */}
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--danger)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
            className="sidebar-item-hover-danger"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div 
          className="sidebar-mobile-overlay" 
          onClick={() => setMobileOpen(false)} 
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            width: '100vw',
            height: 'calc(100vh - 60px)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 85,
            animation: 'fadeIn var(--transition-fast)'
          }}
        />
      )}

      {/* Sidebar Responsive Overlay styles */}
      <style>{`
        .sidebar-item-hover:hover {
          background-color: var(--bg-sidebar-hover) !important;
          color: #ffffff !important;
        }
        .sidebar-item-hover-danger:hover {
          background-color: rgba(239, 68, 68, 0.1) !important;
          color: var(--danger) !important;
        }
        
        @media (max-width: 1024px) {
          .mobile-bar-element {
            display: flex !important;
          }
          .sidebar-nav-container {
            position: fixed !important;
            top: 60px !important;
            left: 0 !important;
            height: calc(100vh - 60px) !important;
            transform: translateX(-100%) !important;
            box-shadow: var(--shadow-lg) !important;
            width: 280px !important;
          }
          .sidebar-nav-container.mobile-show {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}
