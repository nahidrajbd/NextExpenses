// db.js - Mock Local Storage Database for Employee Expense Management System

// Simple deterministic hash for mock passwords
export function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// Initial Data Seeds
const defaultCategories = [
  { id: 'cat-1', name: 'Transport', active: true },
  { id: 'cat-2', name: 'Food', active: true },
  { id: 'cat-3', name: 'Office Supplies', active: true },
  { id: 'cat-4', name: 'Courier', active: true },
  { id: 'cat-5', name: 'Emergency Purchase', active: true },
  { id: 'cat-6', name: 'Other', active: true }
];

const defaultUsers = [
  {
    id: 'user-admin',
    email: 'admin@office.com',
    passwordHash: hashPassword('admin123'),
    name: 'System Admin',
    phone: '+8801711111111',
    role: 'admin',
    status: 'Active',
    dateJoined: '2025-01-01'
  },
  {
    id: 'user-1',
    email: 'nahid@office.com',
    passwordHash: hashPassword('user123'),
    name: 'Nahid Raj',
    phone: '+8801812345678',
    role: 'employee',
    status: 'Active',
    dateJoined: '2025-06-15'
  },
  {
    id: 'user-2',
    email: 'tanvir@office.com',
    passwordHash: hashPassword('user123'),
    name: 'Tanvir Hasan',
    phone: '+8801912345678',
    role: 'employee',
    status: 'Active',
    dateJoined: '2025-02-10'
  },
  {
    id: 'user-3',
    email: 'sultana@office.com',
    passwordHash: hashPassword('user123'),
    name: 'Sultana Razia',
    phone: '+8801512345678',
    role: 'employee',
    status: 'Active',
    dateJoined: '2025-04-01'
  }
];

const defaultExpenses = [
  // Nahid Raj Expenses
  {
    id: 'exp-1',
    employeeId: 'user-1',
    date: '2026-06-10',
    categoryId: 'cat-1',
    description: 'Uber ride to client office',
    amount: 450,
    attachmentId: null,
    notes: 'Client meeting at Dhanmondi.',
    status: 'Approved',
    rejectionComment: ''
  },
  {
    id: 'exp-2',
    employeeId: 'user-1',
    date: '2026-06-15',
    categoryId: 'cat-2',
    description: 'Dinner with clients',
    amount: 2400,
    attachmentId: null,
    notes: 'Dinner at Saltz Restaurant.',
    status: 'Approved',
    rejectionComment: ''
  },
  {
    id: 'exp-3',
    employeeId: 'user-1',
    date: '2026-07-01',
    categoryId: 'cat-3',
    description: 'Printer paper and ink cartridge',
    amount: 1800,
    attachmentId: null,
    notes: 'Urgent office supply replenishment.',
    status: 'Approved',
    rejectionComment: ''
  },
  {
    id: 'exp-4',
    employeeId: 'user-1',
    date: '2026-07-05',
    categoryId: 'cat-4',
    description: 'Sending legal contracts via DHL',
    amount: 350,
    attachmentId: null,
    notes: 'Sent to corporate office.',
    status: 'Pending',
    rejectionComment: ''
  },
  {
    id: 'exp-5',
    employeeId: 'user-1',
    date: '2026-07-06',
    categoryId: 'cat-5',
    description: 'Server backup drive replacement',
    amount: 8500,
    attachmentId: null,
    notes: 'Primary backup drive crashed. Urgent.',
    status: 'Pending',
    rejectionComment: ''
  },
  // Tanvir Hasan Expenses
  {
    id: 'exp-6',
    employeeId: 'user-2',
    date: '2026-06-20',
    categoryId: 'cat-3',
    description: 'Dry erase whiteboard markers',
    amount: 500,
    attachmentId: null,
    notes: 'For Conference Room A.',
    status: 'Approved',
    rejectionComment: ''
  },
  {
    id: 'exp-7',
    employeeId: 'user-2',
    date: '2026-06-25',
    categoryId: 'cat-1',
    description: 'Train ticket for outstation travel',
    amount: 1200,
    attachmentId: null,
    notes: 'Dhaka to Chittagong.',
    status: 'Approved',
    rejectionComment: ''
  },
  {
    id: 'exp-8',
    employeeId: 'user-2',
    date: '2026-07-03',
    categoryId: 'cat-6',
    description: 'Office internet bill renewal',
    amount: 3000,
    attachmentId: null,
    notes: 'Monthly ISP renewal.',
    status: 'Rejected',
    rejectionComment: 'Please route internet bills directly through the IT procurement department.'
  },
  // Sultana Razia Expenses
  {
    id: 'exp-9',
    employeeId: 'user-3',
    date: '2026-06-05',
    categoryId: 'cat-2',
    description: 'Lunch catering for training session',
    amount: 6500,
    attachmentId: null,
    notes: '20 attendees.',
    status: 'Approved',
    rejectionComment: ''
  },
  {
    id: 'exp-10',
    employeeId: 'user-3',
    date: '2026-06-28',
    categoryId: 'cat-4',
    description: 'Express package to overseas branch',
    amount: 4200,
    attachmentId: null,
    notes: 'Urgent hardware sample ship.',
    status: 'Approved',
    rejectionComment: ''
  }
];

const defaultPayments = [
  {
    id: 'pay-1',
    employeeId: 'user-1',
    amount: 2850,
    date: '2026-06-20',
    notes: 'Cleared June approved expenses (Uber & Dinner).',
    recordedBy: 'System Admin'
  },
  {
    id: 'pay-2',
    employeeId: 'user-2',
    amount: 1700,
    date: '2026-07-01',
    notes: 'Fully cleared past approved expenses.',
    recordedBy: 'System Admin'
  },
  {
    id: 'pay-3',
    employeeId: 'user-3',
    amount: 5000,
    date: '2026-06-15',
    notes: 'Partial payment clearance.',
    recordedBy: 'System Admin'
  }
];

const defaultLogs = [
  {
    id: 'log-1',
    timestamp: '2026-06-20T10:15:00.000Z',
    actorId: 'user-admin',
    actionType: 'Approve Expense',
    description: 'Approved expense exp-1 of 450 BDT for Nahid Raj'
  },
  {
    id: 'log-2',
    timestamp: '2026-06-20T10:15:30.000Z',
    actorId: 'user-admin',
    actionType: 'Approve Expense',
    description: 'Approved expense exp-2 of 2400 BDT for Nahid Raj'
  },
  {
    id: 'log-3',
    timestamp: '2026-06-20T11:00:00.000Z',
    actorId: 'user-admin',
    actionType: 'Record Payment',
    description: 'Recorded payment of 2850 BDT for Nahid Raj'
  },
  {
    id: 'log-4',
    timestamp: '2026-07-01T15:30:00.000Z',
    actorId: 'user-admin',
    actionType: 'Record Payment',
    description: 'Recorded payment of 1700 BDT for Tanvir Hasan'
  },
  {
    id: 'log-5',
    timestamp: '2026-07-03T16:00:00.000Z',
    actorId: 'user-admin',
    actionType: 'Reject Expense',
    description: 'Rejected expense exp-8 of 3000 BDT for Tanvir Hasan'
  }
];

const defaultNotifications = [
  {
    id: 'notif-1',
    employeeId: 'user-1',
    title: 'Expense Approved',
    message: 'Your expense for "Uber ride to client office" (450 BDT) has been approved.',
    date: '2026-06-20T10:15:00.000Z',
    read: true
  },
  {
    id: 'notif-2',
    employeeId: 'user-1',
    title: 'Payment Recorded',
    message: 'A payment of 2,850 BDT was recorded for you.',
    date: '2026-06-20T11:00:00.000Z',
    read: true
  },
  {
    id: 'notif-3',
    employeeId: 'user-2',
    title: 'Expense Rejected',
    message: 'Your expense for "Office internet bill renewal" (3000 BDT) has been rejected. Reason: Please route internet bills directly through the IT procurement department.',
    date: '2026-07-03T16:00:00.000Z',
    read: false
  }
];

// Local Storage Handlers
function getItem(key, defaultValue) {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error parsing localStorage key ${key}`, e);
    return defaultValue;
  }
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Database Initialization
export function initDB() {
  getItem('ne_categories', defaultCategories);
  getItem('ne_users', defaultUsers);
  getItem('ne_expenses', defaultExpenses);
  getItem('ne_payments', defaultPayments);
  getItem('ne_logs', defaultLogs);
  getItem('ne_notifications', defaultNotifications);
}

// CRUD Operations
export const db = {
  hashPassword,
  // Categories
  getCategories() {
    return getItem('ne_categories', defaultCategories);
  },
  saveCategories(categories) {
    setItem('ne_categories', categories);
  },
  addCategory(name) {
    const categories = this.getCategories();
    const newCat = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      active: true
    };
    categories.push(newCat);
    this.saveCategories(categories);
    return newCat;
  },
  updateCategory(id, name, active) {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], name: name.trim(), active };
      this.saveCategories(categories);
      return categories[index];
    }
    return null;
  },

  // Users / Employees
  getUsers() {
    return getItem('ne_users', defaultUsers);
  },
  getEmployees() {
    return this.getUsers().filter(u => u.role === 'employee');
  },
  saveUsers(users) {
    setItem('ne_users', users);
  },
  addUser(user) {
    const users = this.getUsers();
    const newUser = {
      id: `user-${Date.now()}`,
      email: user.email.toLowerCase().trim(),
      passwordHash: hashPassword(user.password || 'password123'),
      name: user.name.trim(),
      phone: user.phone.trim(),
      role: user.role || 'employee',
      status: user.status || 'Active',
      dateJoined: user.dateJoined || new Date().toISOString().split('T')[0]
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },
  updateUser(id, updatedData) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      if (updatedData.password) {
        updatedData.passwordHash = hashPassword(updatedData.password);
        delete updatedData.password;
      }
      users[index] = { ...users[index], ...updatedData };
      this.saveUsers(users);
      return users[index];
    }
    return null;
  },

  // Expenses
  getExpenses() {
    return getItem('ne_expenses', defaultExpenses);
  },
  saveExpenses(expenses) {
    setItem('ne_expenses', expenses);
  },
  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExp = {
      id: `exp-${Date.now()}`,
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
    expenses.push(newExp);
    this.saveExpenses(expenses);
    return newExp;
  },
  updateExpense(id, updatedData) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updatedData };
      this.saveExpenses(expenses);
      return expenses[index];
    }
    return null;
  },
  deleteExpense(id) {
    const expenses = this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    this.saveExpenses(filtered);
  },

  // Payments
  getPayments() {
    return getItem('ne_payments', defaultPayments);
  },
  savePayments(payments) {
    setItem('ne_payments', payments);
  },
  addPayment(payment, actorName) {
    const payments = this.getPayments();
    const newPayment = {
      id: `pay-${Date.now()}`,
      employeeId: payment.employeeId,
      amount: parseFloat(payment.amount),
      date: payment.date,
      notes: payment.notes ? payment.notes.trim() : '',
      recordedBy: actorName || 'System Admin'
    };
    payments.push(newPayment);
    this.savePayments(payments);
    return newPayment;
  },

  // Audit Logs
  getLogs() {
    return getItem('ne_logs', defaultLogs);
  },
  saveLogs(logs) {
    setItem('ne_logs', logs);
  },
  addLog(actorId, actionType, description) {
    const logs = this.getLogs();
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId,
      actionType,
      description
    };
    logs.unshift(newLog); // latest log first
    this.saveLogs(logs);
  },

  // Notifications
  getNotifications(employeeId) {
    const all = getItem('ne_notifications', defaultNotifications);
    return all.filter(n => n.employeeId === employeeId);
  },
  addNotification(employeeId, title, message) {
    const all = getItem('ne_notifications', defaultNotifications);
    const newNotif = {
      id: `notif-${Date.now()}`,
      employeeId,
      title,
      message,
      date: new Date().toISOString(),
      read: false
    };
    all.unshift(newNotif);
    setItem('ne_notifications', all);
  },
  markNotificationsAsRead(employeeId) {
    const all = getItem('ne_notifications', defaultNotifications);
    const updated = all.map(n => n.employeeId === employeeId ? { ...n, read: true } : n);
    setItem('ne_notifications', updated);
  },

  // Aggregate Calculations for Employee Balance Ledgers
  getEmployeeLedger() {
    const employees = this.getEmployees();
    const expenses = this.getExpenses();
    const payments = this.getPayments();

    return employees.map(emp => {
      // 1. Spent: Total expenses submitted
      const empExpenses = expenses.filter(e => e.employeeId === emp.id);
      const totalSpent = empExpenses.reduce((sum, e) => sum + e.amount, 0);

      // 2. Approved: Total approved expenses
      const approvedExpenses = empExpenses.filter(e => e.status === 'Approved');
      const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);

      // 3. Paid: Total payments recorded
      const empPayments = payments.filter(p => p.employeeId === emp.id);
      const totalPaid = empPayments.reduce((sum, p) => sum + p.amount, 0);

      // 4. Owed: Approved - Paid
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

  getSingleEmployeeSummary(employeeId) {
    const expenses = this.getExpenses().filter(e => e.employeeId === employeeId);
    const payments = this.getPayments().filter(p => p.employeeId === employeeId);

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
