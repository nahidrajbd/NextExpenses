// db.js - Live Firestore & Firebase Authentication Database for NextExpenses
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  writeBatch 
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { sendSubmissionEmail, sendApprovalEmail, sendTransactionEmail } from './services/emailService';

// Standard Firebase config loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize main Firebase instance
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

// Secondary Auth instance for creating new employees without logging the Admin out
let secondaryAuth = null;
try {
  const secondaryApp = initializeApp(firebaseConfig, "secondary-auth-app");
  secondaryAuth = getAuth(secondaryApp);
} catch (e) {
  console.warn("Secondary Firebase Auth application failed to initialize", e);
}

// Database Initialization (Noop for Firebase, seeded via seed.js)
export function initDB() {
  console.log("Firebase Database client layer initialized.");
}

// Deterministic hashing password fallback (not strictly required for Firebase Auth but kept for legacy compat)
export function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// Firestore operations mapping the previous db.js interface
export const db = {
  hashPassword,

  // Categories
  async getCategories() {
    const qSnapshot = await getDocs(collection(firestore, 'categories'));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addCategory(name) {
    const id = `cat-${Date.now()}`;
    const newCat = {
      id,
      name: name.trim(),
      active: true
    };
    await setDoc(doc(firestore, 'categories', id), newCat);
    return newCat;
  },

  async updateCategory(id, name, active) {
    const catRef = doc(firestore, 'categories', id);
    const updated = { name: name.trim(), active };
    await updateDoc(catRef, updated);
    return { id, ...updated };
  },

  // Users / Employees
  async getUsers() {
    const qSnapshot = await getDocs(collection(firestore, 'users'));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getEmployees() {
    const users = await this.getUsers();
    return users.filter(u => u.role === 'employee');
  },

  async addUser(user) {
    let uid = `user-${Date.now()}`; // Fallback if Auth creation fails
    try {
      if (secondaryAuth) {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          user.email.toLowerCase().trim(), 
          user.password || 'password123'
        );
        uid = userCredential.user.uid;
        await secondaryAuth.signOut(); // Sign out right away
      }
    } catch (e) {
      console.warn("Could not register employee credentials in Firebase Auth:", e.message);
    }

    const newUser = {
      id: uid,
      email: user.email.toLowerCase().trim(),
      name: user.name.trim(),
      phone: user.phone.trim(),
      role: user.role || 'employee',
      status: user.status || 'Active',
      dateJoined: user.dateJoined || new Date().toISOString().split('T')[0],
      emergencyContactName: user.emergencyContactName?.trim() || '',
      emergencyContactRelation: user.emergencyContactRelation?.trim() || 'Guardian',
      emergencyContactPhone: user.emergencyContactPhone?.trim() || '',
      presentAddress: user.presentAddress?.trim() || '',
      permanentAddress: user.permanentAddress?.trim() || ''
    };
    await setDoc(doc(firestore, 'users', uid), newUser);
    return newUser;
  },

  async updateUser(id, updatedData) {
    const userRef = doc(firestore, 'users', id);
    const cleanData = { ...updatedData };
    
    // Auth updates should go through user authentication flow; delete legacy fields
    delete cleanData.password;
    delete cleanData.passwordHash;

    await updateDoc(userRef, cleanData);
    const freshDoc = await getDoc(userRef);
    return { id, ...freshDoc.data() };
  },

  async deleteUser(id) {
    await deleteDoc(doc(firestore, 'users', id));
  },

  // Expenses
  async getExpenses() {
    const qSnapshot = await getDocs(collection(firestore, 'expenses'));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addExpense(expense) {
    const id = `exp-${Date.now()}`;
    const newExp = {
      id,
      employeeId: expense.employeeId,
      date: expense.date,
      categoryId: expense.categoryId,
      description: expense.description.trim(),
      amount: parseFloat(expense.amount),
      attachmentId: expense.attachmentId || null,
      notes: expense.notes ? expense.notes.trim() : '',
      status: 'Pending',
      rejectionComment: ''
    };
    await setDoc(doc(firestore, 'expenses', id), newExp);

    // Trigger email notification asynchronously
    (async () => {
      try {
        const empDoc = await getDoc(doc(firestore, 'users', newExp.employeeId));
        const employee = empDoc.exists() ? empDoc.data() : { name: 'Employee', email: 'employee@office.com' };
        
        const q = query(collection(firestore, 'users'), where('role', '==', 'admin'));
        const qSnapshot = await getDocs(q);
        const admins = qSnapshot.docs.map(doc => doc.data());
        
        await sendSubmissionEmail({ expense: newExp, employee, admins });
      } catch (err) {
        console.error('Failed to trigger submission email notification:', err);
      }
    })();

    return newExp;
  },

  async updateExpense(id, updatedData) {
    const expRef = doc(firestore, 'expenses', id);
    
    // Get previous document to check if status changes
    const prevDoc = await getDoc(expRef);
    const prevData = prevDoc.exists() ? prevDoc.data() : null;

    await updateDoc(expRef, updatedData);
    const freshDoc = await getDoc(expRef);
    const freshData = { id, ...freshDoc.data() };

    // Trigger email notification if status updated to Approved/Rejected
    if (updatedData.status && prevData && prevData.status !== updatedData.status) {
      (async () => {
        try {
          const empDoc = await getDoc(doc(firestore, 'users', freshData.employeeId));
          const employee = empDoc.exists() ? empDoc.data() : { name: 'Employee', email: 'employee@office.com' };
          
          await sendApprovalEmail({ expense: freshData, employee });
        } catch (err) {
          console.error('Failed to trigger approval email notification:', err);
        }
      })();
    }

    return freshData;
  },

  async deleteExpense(id) {
    await deleteDoc(doc(firestore, 'expenses', id));
  },

  // Payments
  async getPayments() {
    const qSnapshot = await getDocs(collection(firestore, 'payments'));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addPayment(payment, actorName) {
    const id = `pay-${Date.now()}`;
    const newPayment = {
      id,
      employeeId: payment.employeeId,
      amount: parseFloat(payment.amount),
      date: payment.date,
      notes: payment.notes ? payment.notes.trim() : '',
      recordedBy: actorName || 'System Admin'
    };
    await setDoc(doc(firestore, 'payments', id), newPayment);

    // Trigger email notification asynchronously
    (async () => {
      try {
        const empDoc = await getDoc(doc(firestore, 'users', newPayment.employeeId));
        const employee = empDoc.exists() ? empDoc.data() : { name: 'Employee', email: 'employee@office.com' };
        
        await sendTransactionEmail({ payment: newPayment, employee });
      } catch (err) {
        console.error('Failed to trigger payment email notification:', err);
      }
    })();

    return newPayment;
  },

  // Audit Logs
  async getLogs() {
    const q = query(collection(firestore, 'logs'), orderBy('timestamp', 'desc'));
    try {
      const qSnapshot = await getDocs(q);
      return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      // Fallback if index is provisioning
      const qSnapshot = await getDocs(collection(firestore, 'logs'));
      const list = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  },

  async addLog(actorId, actionType, description) {
    const id = `log-${Date.now()}`;
    const newLog = {
      id,
      timestamp: new Date().toISOString(),
      actorId,
      actionType,
      description
    };
    await setDoc(doc(firestore, 'logs', id), newLog);
  },

  // Notifications
  async getNotifications(employeeId) {
    const q = query(
      collection(firestore, 'notifications'), 
      where('employeeId', '==', employeeId)
    );
    const qSnapshot = await getDocs(q);
    const list = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async addNotification(employeeId, title, message) {
    const id = `notif-${Date.now()}`;
    const newNotif = {
      id,
      employeeId,
      title,
      message,
      date: new Date().toISOString(),
      read: false
    };
    await setDoc(doc(firestore, 'notifications', id), newNotif);
  },

  async markNotificationsAsRead(employeeId) {
    const q = query(
      collection(firestore, 'notifications'), 
      where('employeeId', '==', employeeId),
      where('read', '==', false)
    );
    const qSnapshot = await getDocs(q);
    const batch = writeBatch(firestore);
    qSnapshot.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, { read: true });
    });
    await batch.commit();
  },

  // Aggregate Calculations for Employee Balance Ledgers
  async getEmployeeLedger() {
    const employees = await this.getEmployees();
    const expenses = await this.getExpenses();
    const payments = await this.getPayments();

    return employees.map(emp => {
      const empExpenses = expenses.filter(e => e.employeeId === emp.id);
      const totalSpent = empExpenses.reduce((sum, e) => sum + e.amount, 0);

      const approvedExpenses = empExpenses.filter(e => e.status === 'Approved');
      const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);

      const empPayments = payments.filter(p => p.employeeId === emp.id);
      const totalPaid = empPayments.reduce((sum, p) => sum + p.amount, 0);

      const balanceDue = totalApproved - totalPaid;

      return {
        employee: emp,
        totalSpent,
        totalApproved,
        totalPaid,
        balanceDue
      };
    });
  },

  async getSingleEmployeeSummary(employeeId) {
    const expenses = (await this.getExpenses()).filter(e => e.employeeId === employeeId);
    const payments = (await this.getPayments()).filter(p => p.employeeId === employeeId);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const approvedExpenses = expenses.filter(e => e.status === 'Approved');
    const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const totalPending = expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0);
    const totalRejected = expenses.filter(e => e.status === 'Rejected').reduce((sum, e) => sum + e.amount, 0);

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = totalApproved - totalPaid;

    const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

    return {
      totalSpent,
      totalApproved,
      totalPending,
      totalRejected,
      totalPaid,
      balanceDue,
      lastPayment
    };
  }
};
