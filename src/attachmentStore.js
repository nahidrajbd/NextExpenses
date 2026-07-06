// attachmentStore.js - IndexedDB storage engine for file attachments up to 10MB (JPG, PNG, PDF)

const DB_NAME = 'NextExpensesFilesDB';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export const attachmentStore = {
  async saveAttachment(name, type, size, base64Data) {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
      const id = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        id,
        name,
        type,
        size,
        base64Data,
        createdAt: new Date().toISOString()
      };

      const request = store.put(record);

      request.onsuccess = () => {
        resolve(id);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  async getAttachment(id) {
    if (!id) return null;
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = (event) => {
        resolve(event.target.result || null);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  async deleteAttachment(id) {
    if (!id) return;
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};
