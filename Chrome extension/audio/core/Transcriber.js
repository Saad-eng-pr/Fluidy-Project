import { EventEmitter, TranscriptionEvents } from './EventEmitter.js';

/**
 * Transcriber - Abstract base class (Strategy Pattern Interface)
 * All transcription backends must implement this interface
 */
export class Transcriber extends EventEmitter {
  constructor() {
    super();
    if (new.target === Transcriber) {
      throw new Error('Transcriber is an abstract class and cannot be instantiated directly');
    }
    this._isInitialized = false;
    this._isProcessing = false;
  }

  /**
   * Get the name of this transcriber implementation
   * @returns {string}
   */
  get name() {
    throw new Error('name getter must be implemented by subclass');
  }

  /**
   * Check if the transcriber is initialized
   * @returns {boolean}
   */
  get isInitialized() {
    return this._isInitialized;
  }

  /**
   * Check if currently processing audio
   * @returns {boolean}
   */
  get isProcessing() {
    return this._isProcessing;
  }

  /**
   * Initialize the transcription model
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Process audio chunk for transcription
   * Should emit TranscriptionEvents.PARTIAL_RESULT with partial results
   * @param {Float32Array} audioData - PCM audio data
   * @returns {Promise<void>}
   */
  async processAudioChunk(audioData) {
    throw new Error('processAudioChunk() must be implemented by subclass');
  }

  /**
   * Finalize transcription and get complete result
   * Should emit TranscriptionEvents.FINAL_RESULT with the final transcript
   * @returns {Promise<string>}
   */
  async finalize() {
    throw new Error('finalize() must be implemented by subclass');
  }

  /**
   * Reset the transcriber state for a new session
   * @returns {Promise<void>}
   */
  async reset() {
    throw new Error('reset() must be implemented by subclass');
  }

  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async dispose() {
    throw new Error('dispose() must be implemented by subclass');
  }

  /**
   * Helper to emit status changes
   * @param {string} status - Current status
   * @param {string} [message] - Optional message
   */
  _emitStatus(status, message = '') {
    this.emit(TranscriptionEvents.STATUS_CHANGE, { status, message });
  }
}

// Export available transcriber types for factory use
export const TranscriberType = {
  VOSK: 'vosk',
  WHISPER: 'whisper'
};
