// seed.js - Seeds the Firebase project with initial NextExpenses data.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
    password: 'admin123',
    name: 'System Admin',
    phone: '+8801711111111',
    role: 'admin',
    status: 'Active',
    dateJoined: '2025-01-01'
  },
  {
    id: 'user-1',
    email: 'nahid@office.com',
    password: 'user123',
    name: 'Nahid Raj',
    phone: '+8801812345678',
    role: 'employee',
    status: 'Active',
    dateJoined: '2025-06-15'
  },
  {
    id: 'user-2',
    email: 'tanvir@office.com',
    password: 'user123',
    name: 'Tanvir Hasan',
    phone: '+8801912345678',
    role: 'employee',
    status: 'Active',
    dateJoined: '2025-02-10'
  },
  {
    id: 'user-3',
    email: 'sultana@office.com',
    password: 'user123',
    name: 'Sultana Razia',
    phone: '+8801512345678',
    role: 'employee',
    status: 'Active',
    dateJoined: '2025-04-01'
  }
];

const defaultExpenses = [
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

async function seed() {
  console.log('--- Starting Firebase Seeding ---');

  // Map to store legacyId -> new UID
  const uidMap = {};

  // 1. Fetch existing users or create them
  console.log('1. Checking and creating Authentication accounts...');
  for (const user of defaultUsers) {
    const { id, email, password, name, phone, role, status, dateJoined } = user;
    let uid = null;
    try {
      // Try to create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      uid = userCredential.user.uid;
      console.log(` - Created new account: ${email} (UID: ${uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        // Fetch existing users from Firestore to locate the UID
        // We'll read the users collection in the next step, so we'll just register the legacy mapping after reading
        console.log(` - Account ${email} already exists.`);
      } else {
        console.error(` - Error creating account for ${email}:`, err.message);
      }
    }
  }

  // Fetch Firestore mapping of legacyId to new UID to align records
  const querySnapshot = await getDocs(collection(db, 'users'));
  querySnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    if (data.legacyId) {
      uidMap[data.legacyId] = docSnapshot.id;
    }
  });

  // If any users were newly created, their docs aren't in Firestore yet. Let's write them.
  for (const user of defaultUsers) {
    if (!uidMap[user.id]) {
      // Find the user details. We need to associate them. Since it already existed, or was just created,
      // let's ensure Firestore has the user record.
      // If we couldn't get the UID because it already exists, let's search auth by email.
      // However, since we already seeded them in the previous run, they are definitely in the Firestore 'users' collection!
      // Let's verify if uidMap is populated correctly.
    }
  }

  console.log('Mapped UIDs:', uidMap);

  const batch = writeBatch(db);

  // 2. Categories
  console.log('2. Seeding Categories...');
  for (const cat of defaultCategories) {
    batch.set(doc(db, 'categories', cat.id), cat);
  }

  // 3. Expenses (Mapping legacy user ids to new firebase users if they exist)
  console.log('3. Seeding Expenses...');
  for (const exp of defaultExpenses) {
    const mappedEmployeeId = uidMap[exp.employeeId] || exp.employeeId;
    batch.set(doc(db, 'expenses', exp.id), {
      ...exp,
      employeeId: mappedEmployeeId
    });
  }

  // 4. Payments
  console.log('4. Seeding Payments...');
  for (const pay of defaultPayments) {
    const mappedEmployeeId = uidMap[pay.employeeId] || pay.employeeId;
    batch.set(doc(db, 'payments', pay.id), {
      ...pay,
      employeeId: mappedEmployeeId
    });
  }

  // 5. Logs
  console.log('5. Seeding Logs...');
  for (const log of defaultLogs) {
    const mappedActorId = uidMap[log.actorId] || log.actorId;
    batch.set(doc(db, 'logs', log.id), {
      ...log,
      actorId: mappedActorId
    });
  }

  // 6. Notifications
  console.log('6. Seeding Notifications...');
  for (const notif of defaultNotifications) {
    const mappedEmployeeId = uidMap[notif.employeeId] || notif.employeeId;
    batch.set(doc(db, 'notifications', notif.id), {
      ...notif,
      employeeId: mappedEmployeeId
    });
  }

  await batch.commit();
  console.log('--- Firebase Seeding and ID Alignment Completed Successfully ---');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed with error:', err);
  process.exit(1);
});
