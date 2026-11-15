// indexedDbStorage.js
/**
 * Bộ Điều Hợp Lưu Trữ Client Đa Tầng (IndexedDB Storage Adapter).
 * Thay thế triệt để giới hạn 5MB của localStorage.
 * Cho phép lưu trữ không giới hạn:
 * - Dữ liệu tinh bàn JSON nguyên bản (TuViMasterPayload)
 * - Ảnh lá số PNG độ nét cao dạng DataURL (vài MB)
 * - Lịch sử các bài luận giải AI nhiều trang
 * 
 * Tuân thủ quy chuẩn: Zero Data-Drop & Offline Persistence.
 */

const DB_NAME = 'TuViHongAn_DB';
const DB_VERSION = 1;
const STORE_CHARTS = 'charts';
const STORE_READINGS = 'readings';
const STORE_SESSIONS = 'sessions';

let dbInstancePromise = null;

function getDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB không được hỗ trợ trên môi trường này.'));
  }

  if (!dbInstancePromise) {
    dbInstancePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Bảng lưu trữ Tinh Bàn Lá Số theo mã băm duy nhất (chartHash)
        if (!db.objectStoreNames.contains(STORE_CHARTS)) {
          const chartStore = db.createObjectStore(STORE_CHARTS, { keyPath: 'chartHash' });
          chartStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Bảng lưu trữ Bản Luận Giải AI theo chartHash
        if (!db.objectStoreNames.contains(STORE_READINGS)) {
          const readingStore = db.createObjectStore(STORE_READINGS, { keyPath: 'chartHash' });
          readingStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Bảng lưu trữ Phiên Luận Giải & Lịch sử Hội thoại theo sessionId
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' });
          sessionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('Lỗi khởi tạo IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  return dbInstancePromise;
}

/**
 * Lưu dữ liệu tinh bàn và ảnh lá số vào IndexedDB
 */
export async function saveChartToIndexedDb(chartHash, payload) {
  if (!chartHash || !payload) return false;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_CHARTS], 'readwrite');
      const store = tx.objectStore(STORE_CHARTS);
      const record = {
        chartHash,
        data: payload,
        updatedAt: Date.now()
      };
      store.put(record);

      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => {
        console.warn('Lỗi ghi IndexedDB STORE_CHARTS:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Không thể truy cập IndexedDB (saveChart):', err);
    return false;
  }
}

/**
 * Lấy dữ liệu tinh bàn theo chartHash
 */
export async function getChartFromIndexedDb(chartHash) {
  if (!chartHash) return null;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_CHARTS], 'readonly');
      const store = tx.objectStore(STORE_CHARTS);
      const req = store.get(chartHash);

      req.onsuccess = () => {
        resolve(req.result ? req.result.data : null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Không thể đọc IndexedDB (getChart):', err);
    return null;
  }
}

/**
 * Lưu bản luận giải AI vào IndexedDB
 */
export async function saveReadingToIndexedDb(chartHash, readingData) {
  if (!chartHash || !readingData) return false;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_READINGS], 'readwrite');
      const store = tx.objectStore(STORE_READINGS);
      store.put({
        chartHash,
        readingData,
        updatedAt: Date.now()
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Không thể ghi IndexedDB (saveReading):', err);
    return false;
  }
}

/**
 * Lấy bản luận giải AI đã lưu theo chartHash
 */
export async function getReadingFromIndexedDb(chartHash) {
  if (!chartHash) return null;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_READINGS], 'readonly');
      const store = tx.objectStore(STORE_READINGS);
      const req = store.get(chartHash);

      req.onsuccess = () => {
        resolve(req.result ? req.result.readingData : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Không thể đọc IndexedDB (getReading):', err);
    return null;
  }
}

/**
 * Lưu phiên làm việc (Session) hoàn chỉnh bao gồm tin nhắn hỏi đáp
 */
export async function saveSessionToIndexedDb(sessionId, sessionData) {
  if (!sessionId || !sessionData) return false;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SESSIONS], 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      store.put({
        sessionId,
        data: sessionData,
        updatedAt: Date.now()
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Không thể ghi IndexedDB (saveSession):', err);
    return false;
  }
}

/**
 * Lấy phiên làm việc theo sessionId
 */
export async function getSessionFromIndexedDb(sessionId) {
  if (!sessionId) return null;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SESSIONS], 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.get(sessionId);

      req.onsuccess = () => {
        resolve(req.result ? req.result.data : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Không thể đọc IndexedDB (getSession):', err);
    return null;
  }
}
