const DB_NAME = 'pokedex-offline-db';
const DB_VERSION = 5;
const STORE_NAME = 'offline-requests';
const USER_CACHE_STORE = 'user-cache';

export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(USER_CACHE_STORE)) {
                db.createObjectStore(USER_CACHE_STORE, { keyPath: 'key' });
            }
        };
    });
};

export const saveFavorites = async (favorites) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([USER_CACHE_STORE], 'readwrite');
        const store = transaction.objectStore(USER_CACHE_STORE);
        const request = store.put({
            key: 'favorites',
            data: favorites,
            timestamp: Date.now()
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const getFavorites = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([USER_CACHE_STORE], 'readonly');
        const store = transaction.objectStore(USER_CACHE_STORE);
        const request = store.get('favorites');

        request.onsuccess = () => resolve(request.result ? request.result.data : null);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const saveRequest = async (requestData) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add({
            url: requestData.url,
            method: requestData.method,
            headers: requestData.headers,
            data: requestData.data,
            timestamp: Date.now()
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const getRequests = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const deleteRequest = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

export const clearRequests = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};
