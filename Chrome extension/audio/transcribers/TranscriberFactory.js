import { WebSpeechTranscriber } from './WebSpeechTranscriber.js';

/**
 * TranscriberFactory - Creates transcriber instances
 * 
 * NOTE: Vosk (vosk-browser) cannot work in Chrome extensions because it uses
 * `new Function()` internally which violates Content Security Policy.
 * Chrome MV3 only allows 'wasm-unsafe-eval', not 'unsafe-eval'.
 * 
 * Current implementation uses Web Speech API which works in extensions.
 * For offline transcription, a local server approach would be needed.
 */
export class TranscriberFactory {
    /**
     * Create transcriber (currently WebSpeech only)
     * @param {Object} options
     * @param {string} [options.preferredType='webspeech'] - Transcriber type
     * @param {string} [options.language='en-US'] - Recognition language
     * @returns {Promise<{transcriber: Transcriber, type: string, isFallback: boolean}>}
     */
    static async createWithFallback(options = {}) {
        // WebSpeech is the only option that works in Chrome extensions
        if (WebSpeechTranscriber.isSupported()) {
            const webSpeech = new WebSpeechTranscriber();
            await webSpeech.initialize({ language: options.language });
            return { transcriber: webSpeech, type: 'webspeech', isFallback: false };
        }

        throw new Error('Web Speech API is not supported in this browser.');
    }

    /**
     * Create a specific transcriber instance
     * @param {string} type - Transcriber type
     * @returns {Transcriber}
     */
    static create(type) {
        switch (type) {
            case 'webspeech':
                return new WebSpeechTranscriber();
            
            default:
                // Only WebSpeech works in Chrome extensions
                console.warn(`Type '${type}' not available, using WebSpeech`);
                return new WebSpeechTranscriber();
        }
    }

    /**
     * Get available transcriber types
     * @returns {Array<{type: string, name: string, description: string, offline: boolean}>}
     */
    static getAvailableTypes() {
        return [
            {
                type: 'webspeech',
                name: 'Web Speech API',
                description: 'Browser built-in recognition. Requires internet.',
                offline: false,
                recommended: true
            }
            // Vosk cannot work in Chrome extensions due to CSP restrictions
            // It requires 'unsafe-eval' which MV3 doesn't allow
        ];
    }

    /**
     * Get available languages
     * @returns {Array<{code: string, name: string}>}
     */
    static getLanguages() {
        return WebSpeechTranscriber.getSupportedLanguages();
    }
}
