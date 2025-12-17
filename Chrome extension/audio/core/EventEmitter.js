/**
 * EventEmitter - Observer Pattern Implementation
 * Enables streaming partial transcription results to the UI
 */
export class EventEmitter {
  constructor() {
    this._events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, listener) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(listener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Subscribe to an event for one-time execution
   * @param {string} event - Event name
   * @param {Function} listener - Callback function
   */
  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener.apply(this, args);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} listener - Callback function
   */
  off(event, listener) {
    if (this._events.has(event)) {
      this._events.get(event).delete(listener);
    }
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {*} data - Data to pass to listeners
   */
  emit(event, data) {
    if (this._events.has(event)) {
      this._events.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} [event] - Optional event name
   */
  removeAllListeners(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this._events.has(event) ? this._events.get(event).size : 0;
  }
}

// Transcription-specific events
export const TranscriptionEvents = {
  PARTIAL_RESULT: 'partialResult',
  FINAL_RESULT: 'finalResult',
  ERROR: 'error',
  STATUS_CHANGE: 'statusChange',
  MODEL_LOADED: 'modelLoaded',
  RECORDING_START: 'recordingStart',
  RECORDING_STOP: 'recordingStop'
};
