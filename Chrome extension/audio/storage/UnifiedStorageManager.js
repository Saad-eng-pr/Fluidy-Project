import { StorageManager } from './StorageManager.js';

/**
 * UnifiedStorageManager - Extends StorageManager to handle both audio memos and video recordings
 * Uses IndexedDB for persistent storage of both media types
 */
export class UnifiedStorageManager extends StorageManager {
  constructor() {
    super();
    this._dbName = 'FluidyStorage';
    this._dbVersion = 2;
    this._audioStoreName = 'audioMemos';
    this._videoStoreName = 'videoRecordings';
    this._stateStoreName = 'appState';
    this._storeName = this._audioStoreName; // Keep compatibility with parent
  }

  /**
   * Initialize the unified database with multiple stores
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open unified database'));
      };

      request.onsuccess = () => {
        this._db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Audio memos store
        if (!db.objectStoreNames.contains(this._audioStoreName)) {
          const audioStore = db.createObjectStore(this._audioStoreName, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          audioStore.createIndex('timestamp', 'timestamp', { unique: false });
          audioStore.createIndex('title', 'title', { unique: false });
        }

        // Video recordings store
        if (!db.objectStoreNames.contains(this._videoStoreName)) {
          const videoStore = db.createObjectStore(this._videoStoreName, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          videoStore.createIndex('timestamp', 'timestamp', { unique: false });
          videoStore.createIndex('type', 'type', { unique: false }); // tab or screen
        }

        // App state store (for recording state, etc.)
        if (!db.objectStoreNames.contains(this._stateStoreName)) {
          db.createObjectStore(this._stateStoreName, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save a video recording
   * @param {Object} video - Video recording object
   * @param {string} video.url - Video blob URL or data URL
   * @param {string} video.type - Recording type ('tab' or 'screen')
   * @param {number} [video.duration] - Video duration in seconds
   * @param {Blob} [video.blob] - Video blob
   * @returns {Promise<number>} Video ID
   */
  async saveVideo(video) {
    await this._ensureInitialized();

    const videoData = {
      url: video.url,
      type: video.type || 'unknown',
      duration: video.duration || 0,
      timestamp: Date.now(),
      blob: video.blob || null,
      title: video.title || `Recording ${new Date().toLocaleString()}`
    };

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._videoStoreName], 'readwrite');
      const store = transaction.objectStore(this._videoStoreName);
      const request = store.add(videoData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to save video'));
      };
    });
  }

  /**
   * Get a video by ID
   * @param {number} id - Video ID
   * @returns {Promise<Object>}
   */
  async getVideo(id) {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._videoStoreName], 'readonly');
      const store = transaction.objectStore(this._videoStoreName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get video'));
      };
    });
  }

  /**
   * Get all videos
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Maximum number of videos to return
   * @param {string} [options.order='desc'] - Sort order ('asc' or 'desc')
   * @returns {Promise<Array<Object>>}
   */
  async getAllVideos(options = {}) {
    await this._ensureInitialized();

    const limit = options.limit || Infinity;
    const order = options.order || 'desc';

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._videoStoreName], 'readonly');
      const store = transaction.objectStore(this._videoStoreName);
      const index = store.index('timestamp');
      
      const direction = order === 'desc' ? 'prev' : 'next';
      const request = index.openCursor(null, direction);
      
      const videos = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && videos.length < limit) {
          videos.push(cursor.value);
          cursor.continue();
        } else {
          resolve(videos);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get videos'));
      };
    });
  }

  /**
   * Delete a video
   * @param {number} id - Video ID
   * @returns {Promise<void>}
   */
  async deleteVideo(id) {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._videoStoreName], 'readwrite');
      const store = transaction.objectStore(this._videoStoreName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete video'));
      };
    });
  }

  /**
   * Get or set app state
   * @param {string} key - State key
   * @param {*} [value] - Value to set (if undefined, performs a get operation)
   * @returns {Promise<*>} Current value
   */
  async state(key, value) {
    await this._ensureInitialized();

    if (value === undefined) {
      // Get operation
      return new Promise((resolve, reject) => {
        const transaction = this._db.transaction([this._stateStoreName], 'readonly');
        const store = transaction.objectStore(this._stateStoreName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result ? request.result.value : null);
        };

        request.onerror = () => {
          reject(new Error(`Failed to get state: ${key}`));
        };
      });
    } else {
      // Set operation
      return new Promise((resolve, reject) => {
        const transaction = this._db.transaction([this._stateStoreName], 'readwrite');
        const store = transaction.objectStore(this._stateStoreName);
        const request = store.put({ key, value });

        request.onsuccess = () => {
          resolve(value);
        };

        request.onerror = () => {
          reject(new Error(`Failed to set state: ${key}`));
        };
      });
    }
  }

  /**
   * Migrate data from chrome.storage.local to IndexedDB
   * This helps transition existing video URLs to the unified storage
   * @returns {Promise<void>}
   */
  async migrateFromChromeStorage() {
    try {
      const result = await chrome.storage.local.get(['videoUrl', 'recording', 'recordingType']);
      
      // Migrate video URL if exists
      if (result.videoUrl) {
        await this.saveVideo({
          url: result.videoUrl,
          type: result.recordingType || 'unknown',
          title: 'Migrated Recording'
        });
        console.log('Migrated video URL to IndexedDB');
      }

      // Migrate recording state
      if (result.recording !== undefined) {
        await this.state('recording', result.recording);
        await this.state('recordingType', result.recordingType || null);
        console.log('Migrated recording state to IndexedDB');
      }
    } catch (error) {
      console.error('Migration from chrome.storage failed:', error);
    }
  }

  /**
   * Override parent's saveMemo to use the correct store name
   */
  async saveMemo(memo) {
    await this._ensureInitialized();

    const memoData = {
      title: memo.title || `Memo ${new Date().toLocaleString()}`,
      transcript: memo.transcript || '',
      duration: memo.duration || 0,
      timestamp: Date.now(),
      audioBlob: memo.audioBlob || null
    };

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._audioStoreName], 'readwrite');
      const store = transaction.objectStore(this._audioStoreName);
      const request = store.add(memoData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to save memo'));
      };
    });
  }

  /**
   * Override parent's getAllMemos to use the correct store name
   */
  async getAllMemos(options = {}) {
    await this._ensureInitialized();

    const limit = options.limit || Infinity;
    const order = options.order || 'desc';

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._audioStoreName], 'readonly');
      const store = transaction.objectStore(this._audioStoreName);
      const index = store.index('timestamp');
      
      const direction = order === 'desc' ? 'prev' : 'next';
      const request = index.openCursor(null, direction);
      
      const memos = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && memos.length < limit) {
          memos.push(cursor.value);
          cursor.continue();
        } else {
          resolve(memos);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get memos'));
      };
    });
  }

  /**
   * Override parent's getMemo to use the correct store name
   */
  async getMemo(id) {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._audioStoreName], 'readonly');
      const store = transaction.objectStore(this._audioStoreName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get memo'));
      };
    });
  }

  /**
   * Override parent's deleteMemo to use the correct store name
   */
  async deleteMemo(id) {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._audioStoreName], 'readwrite');
      const store = transaction.objectStore(this._audioStoreName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete memo'));
      };
    });
  }

  /**
   * Override parent's deleteAllMemos to use the correct store name
   */
  async deleteAllMemos() {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._audioStoreName], 'readwrite');
      const store = transaction.objectStore(this._audioStoreName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete all memos'));
      };
    });
  }

  /**
   * Override parent's updateMemo to use the correct store name
   */
  async updateMemo(id, updates) {
    await this._ensureInitialized();

    const memo = await this.getMemo(id);
    if (!memo) {
      throw new Error(`Memo with id ${id} not found`);
    }

    const updatedMemo = { ...memo, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._audioStoreName], 'readwrite');
      const store = transaction.objectStore(this._audioStoreName);
      const request = store.put(updatedMemo);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to update memo'));
      };
    });
  }

  /**
   * Override parent's getMemoCount to use the correct store name
   */
  async getMemoCount() {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._audioStoreName], 'readonly');
      const store = transaction.objectStore(this._audioStoreName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to count memos'));
      };
    });
  }
}
