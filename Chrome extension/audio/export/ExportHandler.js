/**
 * ExportHandler - Handles downloading and exporting transcripts
 * Single responsibility: Export memos in various formats
 */
export class ExportHandler {
  /**
   * Download transcript as a .txt file
   * @param {string} transcript - The transcript text
   * @param {string} [filename] - Optional filename (without extension)
   */
  static downloadAsText(transcript, filename) {
    const name = filename || `transcript_${Date.now()}`;
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    
    ExportHandler._triggerDownload(blob, `${name}.txt`);
  }

  /**
   * Download transcript as JSON
   * @param {Object} memo - The memo object
   * @param {string} [filename] - Optional filename (without extension)
   */
  static downloadAsJSON(memo, filename) {
    const name = filename || `memo_${Date.now()}`;
    const data = {
      title: memo.title,
      transcript: memo.transcript,
      timestamp: memo.timestamp,
      duration: memo.duration,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json;charset=utf-8' 
    });
    
    ExportHandler._triggerDownload(blob, `${name}.json`);
  }

  /**
   * Download transcript as Markdown
   * @param {Object} memo - The memo object
   * @param {string} [filename] - Optional filename (without extension)
   */
  static downloadAsMarkdown(memo, filename) {
    const name = filename || `memo_${Date.now()}`;
    const date = new Date(memo.timestamp).toLocaleString();
    
    const markdown = `# ${memo.title}

**Date:** ${date}  
**Duration:** ${ExportHandler._formatDuration(memo.duration)}

---

${memo.transcript}

---

*Exported from Audio Memo Transcriber*
`;
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    
    ExportHandler._triggerDownload(blob, `${name}.md`);
  }

  /**
   * Download multiple memos as a single file
   * @param {Array<Object>} memos - Array of memo objects
   * @param {string} format - Export format ('txt', 'json', 'md')
   */
  static downloadAllMemos(memos, format = 'txt') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `all_memos_${timestamp}`;

    switch (format) {
      case 'json':
        ExportHandler._downloadAllAsJSON(memos, filename);
        break;
      case 'md':
        ExportHandler._downloadAllAsMarkdown(memos, filename);
        break;
      default:
        ExportHandler._downloadAllAsText(memos, filename);
    }
  }

  /**
   * Copy transcript to clipboard
   * @param {string} transcript - The transcript text
   * @returns {Promise<void>}
   */
  static async copyToClipboard(transcript) {
    try {
      await navigator.clipboard.writeText(transcript);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = transcript;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Download all memos as JSON
   */
  static _downloadAllAsJSON(memos, filename) {
    const data = {
      exportedAt: new Date().toISOString(),
      totalMemos: memos.length,
      memos: memos.map(m => ({
        title: m.title,
        transcript: m.transcript,
        timestamp: m.timestamp,
        duration: m.duration
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json;charset=utf-8' 
    });
    
    ExportHandler._triggerDownload(blob, `${filename}.json`);
  }

  /**
   * Download all memos as Markdown
   */
  static _downloadAllAsMarkdown(memos, filename) {
    let markdown = `# Audio Memos Export

**Exported:** ${new Date().toLocaleString()}  
**Total Memos:** ${memos.length}

---

`;

    memos.forEach((memo, index) => {
      const date = new Date(memo.timestamp).toLocaleString();
      markdown += `## ${index + 1}. ${memo.title}

**Date:** ${date}  
**Duration:** ${ExportHandler._formatDuration(memo.duration)}

${memo.transcript}

---

`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    ExportHandler._triggerDownload(blob, `${filename}.md`);
  }

  /**
   * Download all memos as plain text
   */
  static _downloadAllAsText(memos, filename) {
    let text = `Audio Memos Export\n`;
    text += `Exported: ${new Date().toLocaleString()}\n`;
    text += `Total Memos: ${memos.length}\n`;
    text += `${'='.repeat(50)}\n\n`;

    memos.forEach((memo, index) => {
      const date = new Date(memo.timestamp).toLocaleString();
      text += `[${index + 1}] ${memo.title}\n`;
      text += `Date: ${date}\n`;
      text += `Duration: ${ExportHandler._formatDuration(memo.duration)}\n`;
      text += `${'-'.repeat(30)}\n`;
      text += `${memo.transcript}\n`;
      text += `\n${'='.repeat(50)}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    ExportHandler._triggerDownload(blob, `${filename}.txt`);
  }

  /**
   * Trigger file download
   */
  static _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Format duration in seconds to mm:ss
   */
  static _formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
