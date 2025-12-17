/**
 * StorageManager - Handles memo persistence using IndexedDB
 * Single responsibility: Store and retrieve audio memos and transcripts
 */
export class StorageManager {
  constructor() {
    this._dbName = 'AudioMemoTranscriber';
    this._dbVersion = 1;
    this._storeName = 'memos';
    this._db = null;
  }

  /**
   * Initialize the database
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this._db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this._storeName)) {
          const store = db.createObjectStore(this._storeName, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
      };
    });
  }

  /**
   * Save a memo
   * @param {Object} memo - Memo object
   * @param {string} memo.title - Memo title
   * @param {string} memo.transcript - Transcribed text
   * @param {number} [memo.duration] - Audio duration in seconds
   * @param {Blob} [memo.audioBlob] - Original audio (optional)
   * @returns {Promise<number>} Memo ID
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
      const transaction = this._db.transaction([this._storeName], 'readwrite');
      const store = transaction.objectStore(this._storeName);
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
   * Get a memo by ID
   * @param {number} id - Memo ID
   * @returns {Promise<Object>}
   */
  async getMemo(id) {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._storeName], 'readonly');
      const store = transaction.objectStore(this._storeName);
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
   * Get all memos
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Maximum number of memos to return
   * @param {string} [options.order='desc'] - Sort order ('asc' or 'desc')
   * @returns {Promise<Array<Object>>}
   */
  async getAllMemos(options = {}) {
    await this._ensureInitialized();

    const limit = options.limit || Infinity;
    const order = options.order || 'desc';

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._storeName], 'readonly');
      const store = transaction.objectStore(this._storeName);
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
   * Update a memo
   * @param {number} id - Memo ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateMemo(id, updates) {
    await this._ensureInitialized();

    const memo = await this.getMemo(id);
    if (!memo) {
      throw new Error(`Memo with id ${id} not found`);
    }

    const updatedMemo = { ...memo, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._storeName], 'readwrite');
      const store = transaction.objectStore(this._storeName);
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
   * Delete a memo
   * @param {number} id - Memo ID
   * @returns {Promise<void>}
   */
  async deleteMemo(id) {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._storeName], 'readwrite');
      const store = transaction.objectStore(this._storeName);
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
   * Delete all memos
   * @returns {Promise<void>}
   */
  async deleteAllMemos() {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._storeName], 'readwrite');
      const store = transaction.objectStore(this._storeName);
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
   * Get total count of memos
   * @returns {Promise<number>}
   */
  async getMemoCount() {
    await this._ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._storeName], 'readonly');
      const store = transaction.objectStore(this._storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to count memos'));
      };
    });
  }

  /**
   * Search memos by title or transcript content
   * @param {string} query - Search query
   * @returns {Promise<Array<Object>>}
   */
  async searchMemos(query) {
    const allMemos = await this.getAllMemos();
    const lowerQuery = query.toLowerCase();
    
    return allMemos.filter(memo => 
      memo.title.toLowerCase().includes(lowerQuery) ||
      memo.transcript.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Ensure database is initialized
   */
  async _ensureInitialized() {
    if (!this._db) {
      await this.initialize();
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }
}
