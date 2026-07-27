import React, { useState, useEffect, createContext, useContext } from 'react';
import { initDB, db } from './db';
import { auth, db as firestore } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
  const [loadingSession, setLoadingSession] = useState(true);

  // Initialize DB and sessions
  useEffect(() => {
    initDB();
    
    // Subscribe to Firebase Authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingSession(true);
      if (firebaseUser) {
        try {
          const userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCurrentUser(userData);
            
            // Sync notifications for employees
            if (userData.role === 'employee') {
              const notifs = await db.getNotifications(userData.id);
              setNotificationsCount(notifs.filter(n => !n.read).length);
            }
          } else {
            console.error('No matching user document found in Firestore.');
            setCurrentUser(null);
          }
        } catch (e) {
          console.error('Session restore failed', e);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingSession(false);
    });

    setDarkMode(false);
    document.body.classList.remove('dark');

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setDarkMode(false);
    document.body.classList.remove('dark');
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      if (!userSnap.exists()) {
        await signOut(auth);
        throw new Error('User record not found in system database.');
      }

      const userData = userSnap.data();
      if (userData.status !== 'Active') {
        await signOut(auth);
        throw new Error('Your account is currently disabled. Please contact the Admin.');
      }

      setCurrentUser(userData);
      setCurrentView('dashboard');
      
      // Notifications count for employees
      if (userData.role === 'employee') {
        const notifs = await db.getNotifications(userData.id);
        setNotificationsCount(notifs.filter(n => !n.read).length);
      }
      
      showToast(`Welcome back, ${userData.name}!`, 'success');
      await db.addLog(userData.id, 'Login', `${userData.name} logged in successfully.`);
    } catch (err) {
      let friendlyMessage = err.message;
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password'
      ) {
        friendlyMessage = 'Invalid email or password.';
      }
      showToast(friendlyMessage, 'error');
      throw err; // Propagate to login component for loading resets
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        await db.addLog(currentUser.id, 'Logout', `${currentUser.name} logged out.`);
      } catch (e) {
        console.warn("Could not log sign-out audit trail.", e);
      }
    }
    await signOut(auth);
    setCurrentUser(null);
    setCurrentView('dashboard');
    showToast('Logged out successfully.', 'info');
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const refreshNotificationCount = async () => {
    if (currentUser && currentUser.role === 'employee') {
      const notifs = await db.getNotifications(currentUser.id);
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

  if (loadingSession) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(101, 178, 232, 0.2)',
            borderTopColor: '#65B2E8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Restoring secure session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <ToastContext.Provider value={{ showToast }}>
        <Login onLogin={login} />
        <ToastList toasts={toasts} />
      </ToastContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      logout, 
      refreshUser: async () => {
        const freshDoc = await getDoc(doc(firestore, 'users', currentUser.id));
        if (freshDoc.exists()) {
          setCurrentUser(freshDoc.data());
        }
      } 
    }}>
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
