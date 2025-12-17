// Import audio modules
import { TranscriberFactory } from './audio/transcribers/TranscriberFactory.js';
import { TranscriptionEvents } from './audio/core/EventEmitter.js';
import { UnifiedStorageManager } from './audio/storage/UnifiedStorageManager.js';
import { ExportHandler } from './audio/export/ExportHandler.js';

class AudioRecorder {
  constructor() {
    this.transcriber = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.startTime = null;
    this.timerInterval = null;
    this.currentTranscript = '';
    this.storage = new UnifiedStorageManager();
    this.currentUILang = 'fr'; // Default to French
    
    this.elements = {
      status: document.getElementById('status'),
      timer: document.getElementById('timer'),
      recordBtn: document.getElementById('record-btn'),
      recordText: document.getElementById('record-text'),
      transcript: document.getElementById('transcript'),
      saveBtn: document.getElementById('save-btn'),
      downloadAudioBtn: document.getElementById('download-audio-btn'),
      copyBtn: document.getElementById('copy-btn'),
      exportTxtBtn: document.getElementById('export-txt-btn'),
      exportJsonBtn: document.getElementById('export-json-btn'),
      clearBtn: document.getElementById('clear-btn'),
      closeBtn: document.getElementById('close-btn'),
      languageSelector: document.getElementById('language-selector'),
      langSwitcher: document.getElementById('lang-switcher')
    };

    this.init();
  }

  async init() {
    await this.storage.initialize();
    this.setupEventListeners();
    // Set French as default for speech recognition
    this.elements.languageSelector.value = 'fr-FR';

    // Listen for messages (for file upload from popup)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'process-audio-file') {
        this.processAudioFile(message.audioData, message.fileName, message.fileType);
      }
    });
  }

  setupEventListeners() {
    // Record button
    this.elements.recordBtn?.addEventListener('click', () => {
      console.log('Record button clicked');
      this.toggleRecording();
    });
    
    // Action buttons
    this.elements.saveBtn?.addEventListener('click', (e) => {
      console.log('Save button clicked, disabled:', e.target.disabled);
      if (!e.target.disabled) this.saveMemo();
    });
    
    this.elements.downloadAudioBtn?.addEventListener('click', (e) => {
      console.log('Download button clicked, disabled:', e.target.disabled);
      if (!e.target.disabled) this.downloadAudio();
    });
    
    this.elements.copyBtn?.addEventListener('click', (e) => {
      console.log('Copy button clicked, disabled:', e.target.disabled);
      if (!e.target.disabled) this.copyTranscript();
    });
    
    this.elements.exportTxtBtn?.addEventListener('click', (e) => {
      console.log('Export TXT button clicked, disabled:', e.target.disabled);
      if (!e.target.disabled) this.exportText();
    });
    
    this.elements.exportJsonBtn?.addEventListener('click', (e) => {
      console.log('Export JSON button clicked, disabled:', e.target.disabled);
      if (!e.target.disabled) this.exportJson();
    });
    
    this.elements.clearBtn?.addEventListener('click', (e) => {
      console.log('Clear button clicked, disabled:', e.target.disabled);
      if (!e.target.disabled) this.clearRecording();
    });
    
    // Other buttons
    this.elements.closeBtn?.addEventListener('click', () => this.closeWindow());
    this.elements.langSwitcher?.addEventListener('click', () => this.toggleUILanguage());
    
    // Language selector
    this.elements.languageSelector?.addEventListener('change', () => {
      if (this.isRecording) {
        this.updateStatus(
          this.currentUILang === 'fr' 
            ? 'Impossible de changer la langue pendant l\'enregistrement' 
            : 'Cannot change language while recording'
        );
        this.elements.languageSelector.value = this.transcriber._language;
      }
    });
    
    console.log('Event listeners setup complete');
  }

  toggleUILanguage() {
    this.currentUILang = this.currentUILang === 'fr' ? 'en' : 'fr';
    this.elements.langSwitcher.textContent = this.currentUILang === 'fr' ? 'EN' : 'FR';
    document.documentElement.lang = this.currentUILang;
    
    // Update all elements with data-fr and data-en attributes
    document.querySelectorAll('[data-fr][data-en]').forEach(element => {
      const text = element.getAttribute(`data-${this.currentUILang}`);
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = text;
      } else {
        // Update textContent for all other elements (spans, divs, buttons)
        // This preserves event listeners which are attached via addEventListener
        element.textContent = text;
      }
    });

    // Update page title
    document.title = this.currentUILang === 'fr' ? 'Enregistrement Audio - Fluidy' : 'Audio Recording - Fluidy';
  }

  // Helper method to get translated text
  t(fr, en) {
    return this.currentUILang === 'fr' ? fr : en;
  }

  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.updateStatus(this.t('Demande d\'accès au microphone...', 'Requesting microphone access...'));

      // Request microphone access - this works in tabs!
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize transcriber
      const language = this.elements.languageSelector.value;
      const result = await TranscriberFactory.createWithFallback({ language });
      this.transcriber = result.transcriber;

      // Setup transcription event listeners
      this.transcriber.on(TranscriptionEvents.PARTIAL_RESULT, (data) => {
        this.updateTranscript(data.text, false);
      });

      this.transcriber.on(TranscriptionEvents.FINAL_RESULT, (data) => {
        this.updateTranscript(data.text, true);
      });

      this.transcriber.on(TranscriptionEvents.ERROR, (data) => {
        console.error('Transcription error:', data);
        this.updateStatus(`${this.t('Erreur', 'Error')}: ${data.message}`, true);
      });

      // Start transcription
      await this.transcriber.startProcessing();

      // Setup audio recording
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('Audio chunk received, size:', event.data.size, 'total chunks:', this.audioChunks.length);
        }
      };

      // Request data every 100ms to collect audio chunks
      this.mediaRecorder.start(100);

      // Update UI
      this.isRecording = true;
      this.startTime = Date.now();
      this.currentTranscript = '';
      this.elements.transcript.textContent = '';
      this.elements.recordBtn.classList.add('recording');
      this.elements.recordText.textContent = this.t('Arrêter l\'enregistrement', 'Stop Recording');
      this.updateStatus(this.t('Enregistrement en cours...', 'Recording...'), false, true);

      // Start timer
      this.startTimer();

      // Notify service worker
      chrome.runtime.sendMessage({ type: 'audio-recording-started' });

    } catch (error) {
      console.error('Failed to start recording:', error);
      
      // Specific error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.updateStatus(this.t('Accès au microphone refusé', 'Microphone access denied'), true);
        alert(this.t(
          'Accès au microphone refusé. Veuillez autoriser l\'accès au microphone et réessayer.',
          'Microphone access denied. Please allow microphone access when prompted and try again.'
        ));
      } else if (error.name === 'NotFoundError') {
        this.updateStatus(this.t('Aucun microphone trouvé', 'No microphone found'), true);
        alert(this.t(
          'Aucun microphone trouvé. Veuillez connecter un microphone et réessayer.',
          'No microphone found. Please connect a microphone and try again.'
        ));
      } else {
        this.updateStatus(`${this.t('Erreur', 'Error')}: ${error.message}`, true);
        alert(this.t(
          'Échec du démarrage de l\'enregistrement: ',
          'Failed to start recording: '
        ) + error.message);
      }
    }
  }

  async stopRecording() {
    try {
      // Stop transcription
      if (this.transcriber) {
        await this.transcriber.stopProcessing();
      }

      // Stop audio recording
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        
        // Stop all tracks
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }

      // Update UI
      this.isRecording = false;
      this.stopTimer();
      this.elements.recordBtn.classList.remove('recording');
      this.elements.recordText.textContent = this.t('Démarrer l\'enregistrement', 'Start Recording');
      this.updateStatus(this.t('Enregistrement arrêté', 'Recording stopped'));

      // Enable action buttons
      const hasTranscript = this.currentTranscript.trim().length > 0;
      console.log('Enabling buttons - hasTranscript:', hasTranscript, 'audioChunks:', this.audioChunks.length);
      this.elements.saveBtn.disabled = !hasTranscript;
      this.elements.downloadAudioBtn.disabled = this.audioChunks.length === 0;
      this.elements.copyBtn.disabled = !hasTranscript;
      this.elements.exportTxtBtn.disabled = !hasTranscript;
      this.elements.exportJsonBtn.disabled = !hasTranscript;
      this.elements.clearBtn.disabled = false; // Always enable clear after recording
      console.log('Button states:', {
        save: this.elements.saveBtn.disabled,
        download: this.elements.downloadAudioBtn.disabled,
        copy: this.elements.copyBtn.disabled,
        exportTxt: this.elements.exportTxtBtn.disabled,
        exportJson: this.elements.exportJsonBtn.disabled,
        clear: this.elements.clearBtn.disabled
      });

      // Notify service worker
      chrome.runtime.sendMessage({ type: 'audio-recording-stopped' });

    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  updateTranscript(text, isFinal) {
    if (isFinal) {
      // Add final text to transcript
      this.currentTranscript += (this.currentTranscript ? ' ' : '') + text;
      this.elements.transcript.textContent = this.currentTranscript;
    } else {
      // Show interim result
      const finalText = this.currentTranscript;
      const interimText = text;
      this.elements.transcript.innerHTML = 
        `${finalText}${finalText ? ' ' : ''}<span class="transcript-interim">${interimText}</span>`;
    }

    // Auto-scroll to bottom
    this.elements.transcript.parentElement.scrollTop = this.elements.transcript.parentElement.scrollHeight;
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.elements.timer.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 100);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateStatus(message, isError = false, isRecording = false) {
    this.elements.status.textContent = message;
    this.elements.status.classList.toggle('recording', isRecording);
  }

  async saveMemo() {
    const title = prompt(
      this.t('Entrez un titre pour ce mémo:', 'Enter a title for this memo:'),
      `${this.t('Mémo', 'Memo')} ${new Date().toLocaleString()}`
    );
    if (!title) return;

    try {
      const duration = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
      
      // Create audio blob
      const audioBlob = this.audioChunks.length > 0 
        ? new Blob(this.audioChunks, { type: 'audio/webm' })
        : null;

      await this.storage.saveMemo({
        title,
        transcript: this.currentTranscript,
        duration,
        audioBlob
      });

      this.updateStatus(this.t('Mémo enregistré avec succès!', 'Memo saved successfully!'));
      
      // Show success message briefly, then restore ready state
      // Note: We keep transcript and audio for further actions (download, copy, export)
      setTimeout(() => {
        this.updateStatus(this.t('Mémo enregistré - Vous pouvez continuer', 'Memo saved - You can continue'));
      }, 2000);

    } catch (error) {
      console.error('Failed to save memo:', error);
      alert(this.t(
        'Échec de l\'enregistrement du mémo: ',
        'Failed to save memo: '
      ) + error.message);
    }
  }

  async copyTranscript() {
    try {
      await ExportHandler.copyToClipboard(this.currentTranscript);
      this.updateStatus(this.t('Copié dans le presse-papiers!', 'Copied to clipboard!'));
      setTimeout(() => {
        this.updateStatus(this.t('Texte copié', 'Text copied'));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert(this.t(
        'Échec de la copie dans le presse-papiers',
        'Failed to copy to clipboard'
      ));
    }
  }

  downloadAudio() {
    if (this.audioChunks.length === 0) {
      alert(this.t(
        'Aucun audio à télécharger',
        'No audio to download'
      ));
      return;
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_recording_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.updateStatus(this.t('Audio téléchargé avec succès!', 'Audio downloaded successfully!'));
      setTimeout(() => {
        this.updateStatus(this.t('Fichier téléchargé', 'File downloaded'));
      }, 2000);
    } catch (error) {
      console.error('Failed to download audio:', error);
      alert(this.t(
        'Échec du téléchargement de l\'audio',
        'Failed to download audio'
      ));
    }
  }

  exportText() {
    ExportHandler.downloadAsText(this.currentTranscript, `transcript_${Date.now()}`);
    this.updateStatus(this.t('Exporté en TXT', 'Exported as TXT'));
  }

  exportJson() {
    const memo = {
      title: `${this.t('Transcription', 'Transcript')} ${new Date().toLocaleString()}`,
      transcript: this.currentTranscript,
      timestamp: Date.now(),
      duration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0
    };
    ExportHandler.downloadAsJSON(memo, `transcript_${Date.now()}`);
    this.updateStatus(this.t('Exporté en JSON', 'Exported as JSON'));
  }

  closeWindow() {
    if (this.isRecording) {
      if (confirm(this.t(
        'Enregistrement en cours. Êtes-vous sûr de vouloir fermer?',
        'Recording in progress. Are you sure you want to close?'
      ))) {
        this.stopRecording();
        window.close();
      }
    } else {
      window.close();
    }
  }

  clearRecording() {
    // Stop any active recording
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.stopRecording();
    }

    // Stop and cleanup transcriber
    if (this.transcriber) {
      this.transcriber.stop();
      this.transcriber = null;
    }

    // Clear audio data
    this.audioChunks = [];

    // Clear transcript
    this.currentTranscript = '';
    if (this.elements.transcript) {
      this.elements.transcript.textContent = '';
    }

    // Reset timer
    this.startTime = null;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.updateTimer();

    // Reset record button
    this.isRecording = false;
    if (this.elements.recordBtn) {
      this.elements.recordText.textContent = this.t('Démarrer l\'enregistrement', 'Start Recording');
      this.elements.recordBtn.disabled = false;
      this.elements.recordBtn.classList.remove('recording');
    }

    // Disable action buttons
    if (this.elements.saveBtn) this.elements.saveBtn.disabled = true;
    if (this.elements.downloadAudioBtn) this.elements.downloadAudioBtn.disabled = true;
    if (this.elements.copyBtn) this.elements.copyBtn.disabled = true;
    if (this.elements.exportTxtBtn) this.elements.exportTxtBtn.disabled = true;
    if (this.elements.exportJsonBtn) this.elements.exportJsonBtn.disabled = true;
    if (this.elements.clearBtn) this.elements.clearBtn.disabled = true;

    // Update status
    this.updateStatus(this.t('Prêt à enregistrer', 'Ready to record'), 'default');
  }

  async processAudioFile(audioDataUrl, fileName, fileType) {
    try {
      this.updateStatus(this.t(
        'Traitement du fichier audio...',
        'Processing audio file...'
      ));

      // Convert data URL to blob
      const response = await fetch(audioDataUrl);
      const blob = await response.blob();

      // Create an audio element to play the file
      const audio = new Audio(audioDataUrl);
      audio.controls = false;
      
      // Store audio for later download
      this.audioChunks = [blob];
      this.currentTranscript = '';
      this.elements.transcript.textContent = '';
      
      // Initialize transcriber (will use microphone for live transcription)
      const language = this.elements.languageSelector.value;
      const result = await TranscriberFactory.createWithFallback({ language });
      this.transcriber = result.transcriber;

      // Setup transcription listeners
      this.transcriber.on(TranscriptionEvents.PARTIAL_RESULT, (data) => {
        this.updateTranscript(data.text, false);
      });

      this.transcriber.on(TranscriptionEvents.FINAL_RESULT, (data) => {
        this.updateTranscript(data.text, true);
      });

      this.transcriber.on(TranscriptionEvents.ERROR, (data) => {
        console.error('Transcription error:', data);
        this.updateStatus(`${this.t('Erreur', 'Error')}: ${data.message}`, true);
      });

      // Start transcription (using microphone)
      // Note: Web Speech API can't transcribe from audio files, only live microphone
      // So we play the audio and the user should repeat/speak what they hear
      await this.transcriber.startProcessing();

      // Status update explaining the workflow
      this.updateStatus(this.t(
        `Lecture: ${fileName} - Répétez ce que vous entendez pour transcrire`,
        `Playing: ${fileName} - Repeat what you hear to transcribe`
      ));
      
      this.startTime = Date.now();
      this.startTimer();

      // Enable recording UI
      this.isRecording = true;
      this.elements.recordBtn.classList.add('recording');
      this.elements.recordText.textContent = this.t('Arrêter la transcription', 'Stop Transcription');

      // Play the audio
      audio.play();

      // Play the audio
      audio.play();

      // When audio ends, keep transcription active
      audio.onended = () => {
        this.updateStatus(this.t(
          'Audio terminé - Continuez à parler ou cliquez pour arrêter',
          'Audio finished - Keep speaking or click to stop'
        ));
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.updateStatus(this.t(
          'Erreur de lecture audio',
          'Audio playback error'
        ), true);
      };

    } catch (error) {
      console.error('Failed to process audio file:', error);
      this.updateStatus(this.t(
        'Échec du traitement du fichier audio',
        'Failed to process audio file'
      ), true);
      alert(this.t(
        'Impossible de traiter ce fichier audio. Assurez-vous qu\'il s\'agit d\'un format audio valide.',
        'Cannot process this audio file. Make sure it is a valid audio format.'
      ));
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AudioRecorder();
});
