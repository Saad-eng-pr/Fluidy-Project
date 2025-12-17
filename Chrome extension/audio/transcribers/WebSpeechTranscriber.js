import { Transcriber } from '../core/Transcriber.js';
import { TranscriptionEvents } from '../core/EventEmitter.js';

/**
 * WebSpeechTranscriber - Web Speech API fallback implementation
 * Used when Vosk is unavailable (requires internet connection)
 */
export class WebSpeechTranscriber extends Transcriber {
    constructor() {
        super();
        this._recognition = null;
        this._language = 'en-US';
        this._isSupported = false;
    }

    get name() {
        return 'WebSpeech';
    }

    get isOffline() {
        return false; // Web Speech API requires internet
    }

    /**
     * Check if Web Speech API is supported
     * @returns {boolean}
     */
    static isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    /**
     * Initialize Web Speech API
     * @param {Object} options
     * @param {string} [options.language='en-US'] - Recognition language
     */
    async initialize(options = {}) {
        if (this._isInitialized) return;

        this._emitStatus('initializing', 'Setting up Web Speech API...');

        if (!WebSpeechTranscriber.isSupported()) {
            throw new Error('Web Speech API is not supported in this browser');
        }

        this._language = options.language || 'en-US';
        this._isSupported = true;
        this._isInitialized = true;

        this._emitStatus('ready', 'Web Speech API ready');
        this.emit(TranscriptionEvents.MODEL_LOADED, { name: this.name });
    }

    /**
     * Start transcription
     */
    async startProcessing() {
        if (!this._isInitialized) {
            throw new Error('WebSpeechTranscriber not initialized');
        }

        if (this._isProcessing) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this._recognition = new SpeechRecognition();
        
        this._recognition.continuous = true;
        this._recognition.interimResults = true;
        this._recognition.lang = this._language;

        this._recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    this.emit(TranscriptionEvents.FINAL_RESULT, {
                        text: transcript,
                        confidence: result[0].confidence
                    });
                } else {
                    this.emit(TranscriptionEvents.PARTIAL_RESULT, {
                        text: transcript,
                        isFinal: false
                    });
                }
            }
        };

        this._recognition.onerror = (event) => {
            // Ignore no-speech errors during continuous recognition
            if (event.error === 'no-speech') {
                return;
            }
            this.emit(TranscriptionEvents.ERROR, {
                message: `Speech recognition error: ${event.error}`,
                code: event.error
            });
        };

        this._recognition.onend = () => {
            // Auto-restart if still processing
            if (this._isProcessing) {
                try {
                    this._recognition.start();
                } catch (e) {
                    // Ignore restart errors
                }
            }
        };

        this._recognition.start();
        this._isProcessing = true;
        this._emitStatus('processing', 'Listening...');
    }

    /**
     * Stop transcription
     */
    async stopProcessing() {
        if (!this._isProcessing) return;

        this._isProcessing = false;

        if (this._recognition) {
            this._recognition.stop();
            this._recognition = null;
        }

        this._emitStatus('ready', 'Stopped');
    }

    /**
     * Process audio chunk (not used for Web Speech API - it handles its own audio)
     */
    async processAudioChunk(audioData) {
        // Web Speech API manages its own audio input
        // This method exists to satisfy the interface
    }

    /**
     * Set recognition language
     * @param {string} language - BCP 47 language tag
     */
    setLanguage(language) {
        this._language = language;
        if (this._recognition) {
            this._recognition.lang = language;
        }
    }

    /**
     * Get supported languages
     * @returns {Array<{code: string, name: string}>}
     */
    static getSupportedLanguages() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish (Spain)' },
            { code: 'es-MX', name: 'Spanish (Mexico)' },
            { code: 'fr-FR', name: 'French' },
            { code: 'de-DE', name: 'German' },
            { code: 'it-IT', name: 'Italian' },
            { code: 'pt-BR', name: 'Portuguese (Brazil)' },
            { code: 'ja-JP', name: 'Japanese' },
            { code: 'ko-KR', name: 'Korean' },
            { code: 'zh-CN', name: 'Chinese (Mandarin)' },
            { code: 'ar-SA', name: 'Arabic' },
            { code: 'ru-RU', name: 'Russian' },
            { code: 'hi-IN', name: 'Hindi' }
        ];
    }

    /**
     * Clean up resources
     */
    async terminate() {
        await this.stopProcessing();
        this._isInitialized = false;
    }
}
