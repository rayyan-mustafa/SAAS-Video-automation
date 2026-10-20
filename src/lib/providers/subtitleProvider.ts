export interface SubtitleCue {
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  text: string;
}

export interface SubtitleProvider {
  generateCues(scenes: Array<{ sceneIndex: number; estimatedDurationSec: number; subtitleText: string }>): SubtitleCue[];
  generateSrt(cues: SubtitleCue[]): string;
  generateVtt(cues: SubtitleCue[]): string;
}

class DefaultSubtitleProvider implements SubtitleProvider {
  generateCues(scenes: Array<{ sceneIndex: number; estimatedDurationSec: number; subtitleText: string }>): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    let currentTime = 0;
    let cueIndex = 1;

    for (const scene of scenes) {
      const sceneDuration = scene.estimatedDurationSec;
      const cleanText = scene.subtitleText.trim();

      // Break text into natural sentences/phrases
      const phrases = this.splitIntoPhrases(cleanText);
      const totalWords = cleanText.split(/\s+/).filter(Boolean).length;

      let phraseOffset = 0;
      for (const phrase of phrases) {
        const wordsInPhrase = phrase.split(/\s+/).filter(Boolean).length;
        // Allocate duration proportional to word count
        const phraseDuration = totalWords > 0 ? (wordsInPhrase / totalWords) * sceneDuration : sceneDuration / phrases.length;
        const start = currentTime + phraseOffset;
        const end = start + phraseDuration;

        // Format phrase into max 2 lines (max ~38 chars per line)
        const formattedText = this.formatLines(phrase);

        cues.push({
          index: cueIndex++,
          startTimeSec: start,
          endTimeSec: end,
          text: formattedText,
        });

        phraseOffset += phraseDuration;
      }

      currentTime += sceneDuration;
    }

    return cues;
  }

  generateSrt(cues: SubtitleCue[]): string {
    return cues
      .map((cue) => {
        const startStr = this.formatSrtTime(cue.startTimeSec);
        const endStr = this.formatSrtTime(cue.endTimeSec);
        return `${cue.index}\n${startStr} --> ${endStr}\n${cue.text}\n`;
      })
      .join('\n');
  }

  generateVtt(cues: SubtitleCue[]): string {
    const header = 'WEBVTT\n\n';
    const body = cues
      .map((cue) => {
        const startStr = this.formatVttTime(cue.startTimeSec);
        const endStr = this.formatVttTime(cue.endTimeSec);
        return `${cue.index}\n${startStr} --> ${endStr}\n${cue.text}\n`;
      })
      .join('\n');
    return header + body;
  }

  private splitIntoPhrases(text: string): string[] {
    // Break into natural clauses by punctuation or kinetic chunks of 3-5 words for Shorts retention
    const rawClauses = text.split(/(?<=[.,!?:;])\s+/).filter(Boolean);
    const phrases: string[] = [];

    for (const clause of rawClauses) {
      const words = clause.split(/\s+/).filter(Boolean);
      if (words.length <= 5) {
        phrases.push(clause);
      } else {
        // Split longer clauses into punchy 3-4 word kinetic chunks
        const chunkSize = 4;
        for (let i = 0; i < words.length; i += chunkSize) {
          phrases.push(words.slice(i, i + chunkSize).join(' '));
        }
      }
    }

    return phrases.length > 0 ? phrases : [text];
  }

  private formatLines(phrase: string): string {
    const words = phrase.split(/\s+/).filter(Boolean);
    if (words.length <= 4 || phrase.length <= 26) {
      return phrase;
    }

    // Split across 2 balanced lines for mobile screen readability
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    return `${line1}\n${line2}`;
  }

  private formatSrtTime(seconds: number): string {
    const totalMs = Math.floor(seconds * 1000);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  private formatVttTime(seconds: number): string {
    const totalMs = Math.floor(seconds * 1000);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
}

export const subtitleProvider: SubtitleProvider = new DefaultSubtitleProvider();
