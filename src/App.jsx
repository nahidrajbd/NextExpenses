import React, { useState, useEffect, createContext, useContext } from 'react';
import { initDB, db } from './db';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import ExpensesList from './components/ExpensesList';
import CategoriesManager from './components/CategoriesManager';
import PaymentsModule from './components/PaymentsModule';
import ReportsModule from './components/ReportsModule';
import AuditLogs from './components/AuditLogs';
import Profile from './components/Profile';
import EmployeesManager from './components/EmployeesManager';

export const AuthContext = createContext(null);
export const ThemeContext = createContext(null);
export const ToastContext = createContext(null);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [notificationsCount, setNotificationsCount] = useState(0);

  // Initialize DB and sessions
  useEffect(() => {
    initDB();
    const storedUser = localStorage.getItem('ne_current_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        // Sync notifications
        if (parsed.role === 'employee') {
          const notifs = db.getNotifications(parsed.id);
          setNotificationsCount(notifs.filter(n => !n.read).length);
        }
      } catch (e) {
        console.error('Session restore failed', e);
      }
    }

    const storedTheme = localStorage.getItem('ne_theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.body.classList.add('dark');
    } else {
      setDarkMode(false);
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('ne_theme', next ? 'dark' : 'light');
      if (next) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
      return next;
    });
  };

  const login = (email, password) => {
    const users = db.getUsers();
    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const hashed = db.hashPassword(password);
    if (user.passwordHash !== hashed) {
      throw new Error('Invalid email or password.');
    }

    if (user.status !== 'Active') {
      throw new Error('Your account is currently disabled. Please contact the Admin.');
    }

    setCurrentUser(user);
    setCurrentView('dashboard');
    localStorage.setItem('ne_current_user', JSON.stringify(user));
    
    // Notifications count for employees
    if (user.role === 'employee') {
      const notifs = db.getNotifications(user.id);
      setNotificationsCount(notifs.filter(n => !n.read).length);
    }
    
    showToast(`Welcome back, ${user.name}!`, 'success');
    db.addLog(user.id, 'Login', `${user.name} logged in successfully.`);
  };

  const logout = () => {
    if (currentUser) {
      db.addLog(currentUser.id, 'Logout', `${currentUser.name} logged out.`);
    }
    setCurrentUser(null);
    setCurrentView('dashboard');
    localStorage.removeItem('ne_current_user');
    showToast('Logged out successfully.', 'info');
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const refreshNotificationCount = () => {
    if (currentUser && currentUser.role === 'employee') {
      const notifs = db.getNotifications(currentUser.id);
      setNotificationsCount(notifs.filter(n => !n.read).length);
    }
  };

  const renderCurrentView = () => {
    if (!currentUser) return null;

    if (currentUser.role === 'admin') {
      switch (currentView) {
        case 'dashboard':
          return <AdminDashboard onViewChange={setCurrentView} />;
        case 'expenses':
          return <ExpensesList />;
        case 'categories':
          return <CategoriesManager />;
        case 'payments':
          return <PaymentsModule />;
        case 'reports':
          return <ReportsModule />;
        case 'logs':
          return <AuditLogs />;
        case 'profile':
          return <Profile />;
        case 'employees':
          return <EmployeesManager />;
        default:
          return <AdminDashboard onViewChange={setCurrentView} />;
      }
    } else {
      switch (currentView) {
        case 'dashboard':
          return <EmployeeDashboard onRefreshNotifs={refreshNotificationCount} />;
        case 'expenses':
          return <ExpensesList employeeId={currentUser.id} />;
        case 'profile':
          return <Profile />;
        default:
          return <EmployeeDashboard onRefreshNotifs={refreshNotificationCount} />;
      }
    }
  };

  if (!currentUser) {
    return (
      <ToastContext.Provider value={{ showToast }}>
        <Login onLogin={login} />
        <ToastList toasts={toasts} />
      </ToastContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, logout, refreshUser: () => {
      const fresh = db.getUsers().find(u => u.id === currentUser.id);
      setCurrentUser(fresh);
      localStorage.setItem('ne_current_user', JSON.stringify(fresh));
    } }}>
      <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
        <ToastContext.Provider value={{ showToast }}>
          <div className="app-container">
            <Sidebar 
              currentView={currentView} 
              onViewChange={setCurrentView} 
              notificationsCount={notificationsCount}
              onRefreshNotifs={refreshNotificationCount}
            />
            <main className="main-content">
              {renderCurrentView()}
            </main>
          </div>

          <ToastList toasts={toasts} />
        </ToastContext.Provider>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

function ToastList({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
