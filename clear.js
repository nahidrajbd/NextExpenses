// clear.js - Clears all dummy demo data from Firestore.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

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

async function clearCollection(collectionName, keepFilter = () => false) {
  console.log(`Clearing collection "${collectionName}"...`);
  const querySnapshot = await getDocs(collection(db, collectionName));
  const batch = writeBatch(db);
  let count = 0;
  
  querySnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    if (!keepFilter(data, docSnapshot.id)) {
      batch.delete(docSnapshot.ref);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(` - Deleted ${count} documents from ${collectionName}`);
  } else {
    console.log(` - No documents deleted from ${collectionName}`);
  }
}

async function run() {
  console.log('--- Clearing Dummy Data ---');
  
  // Clear collections completely
  await clearCollection('expenses');
  await clearCollection('payments');
  await clearCollection('logs');
  await clearCollection('notifications');
  await clearCollection('categories');
  
  // Clear users EXCEPT the admin user
  await clearCollection('users', (userData, docId) => {
    return userData.email === 'admin@office.com';
  });

  console.log('--- Dummy Data Cleared Successfully ---');
  process.exit(0);
}

run().catch(err => {
  console.error('Clearing script failed:', err);
  process.exit(1);
});
