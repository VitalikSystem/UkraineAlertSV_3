// Web Audio API and Gemini TTS playback controller

class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.85;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public stopAll() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // already stopped
      }
      this.currentSource = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  /**
   * Play the official Ukrainian Civil Defense / "Повітряна тривога" style All-Clear two-tone chime.
   * Gentle double chime (C5 -> E5, 523Hz -> 659Hz) indicating safety.
   */
  public async playAllClearChime(): Promise<void> {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, now);
    masterGain.connect(ctx.destination);

    // Note 1: 523.25 Hz (C5)
    this.createChimeNote(ctx, masterGain, 523.25, now, 0.9);
    // Note 2: 659.25 Hz (E5)
    this.createChimeNote(ctx, masterGain, 659.25, now + 0.35, 1.2);
    // Note 3: 783.99 Hz (G5 harmonic sparkle)
    this.createChimeNote(ctx, masterGain, 783.99, now + 0.7, 1.4);

    return new Promise((resolve) => setTimeout(resolve, 1400));
  }

  /**
   * Play Yellow Level warning tone (UAV / Drone caution pulse)
   */
  public async playYellowWarningTone(): Promise<void> {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.4, now);
    masterGain.connect(ctx.destination);

    // Two caution radar-like pings (587.33 Hz - D5)
    this.createChimeNote(ctx, masterGain, 587.33, now, 0.35);
    this.createChimeNote(ctx, masterGain, 587.33, now + 0.3, 0.5);

    return new Promise((resolve) => setTimeout(resolve, 850));
  }

  /**
   * Play Red Level missile danger alarm tone (Forte rapid alert tone)
   */
  public async playRedAlertSirenTone(): Promise<void> {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(ctx.destination);

    // High urgent two-tone alarm (880Hz -> 659Hz -> 880Hz)
    this.createChimeNote(ctx, masterGain, 880, now, 0.25);
    this.createChimeNote(ctx, masterGain, 659.25, now + 0.2, 0.25);
    this.createChimeNote(ctx, masterGain, 880, now + 0.4, 0.4);

    return new Promise((resolve) => setTimeout(resolve, 900));
  }

  /**
   * Play attention / warning chime (Forte rising alert)
   */
  public async playAlertChime(): Promise<void> {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(ctx.destination);

    // 440Hz -> 880Hz alert tone
    this.createChimeNote(ctx, masterGain, 440, now, 0.3);
    this.createChimeNote(ctx, masterGain, 880, now + 0.25, 0.6);

    return new Promise((resolve) => setTimeout(resolve, 800));
  }

  /**
   * Helper to create a bell/chime harmonic tone with exponential decay
   */
  private createChimeNote(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    startTime: number,
    duration: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    // Subtle overtone for richer chime acoustics
    const overtoneOsc = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtoneOsc.type = 'sine';
    overtoneOsc.frequency.setValueAtTime(freq * 2.76, startTime);
    overtoneGain.gain.setValueAtTime(0.15, startTime);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4);

    osc.connect(gain);
    overtoneOsc.connect(overtoneGain);
    gain.connect(destination);
    overtoneGain.connect(destination);

    osc.start(startTime);
    overtoneOsc.start(startTime);
    osc.stop(startTime + duration);
    overtoneOsc.stop(startTime + duration);
  }

  /**
   * Synthesize air raid alert siren for testing sirens
   */
  public async playSirenSimulation(seconds = 3): Promise<void> {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(this.volume * 0.18, now);

    // Modulate pitch between 380Hz and 650Hz
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.5, now); // 2 second cycle
    lfoGain.gain.setValueAtTime(140, now);

    lfo.connect(osc.frequency);
    osc.frequency.setValueAtTime(500, now);

    // Lowpass filter to make it sound like an acoustic outdoor horn
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.5);
    gain.gain.setValueAtTime(this.volume * 0.2, now + seconds - 0.5);
    gain.gain.linearRampToValueAtTime(0.001, now + seconds);

    setTimeout(() => {
      try {
        osc.stop();
        lfo.stop();
      } catch (e) {}
    }, seconds * 1000);
  }

  /**
   * Play base64 WAV audio received from Gemini 3.8 Flash TTS
   * @param base64Audio base64 string
   * @param introSound whether to play the chime or specific level tone ('clear' | 'yellow' | 'red' | boolean)
   * @param onProgress callback with currentTime and duration
   * @param onEnded callback when speech playback ends
   */
  public async playGeminiWav(
    base64Audio: string,
    introSound: boolean | 'clear' | 'yellow' | 'red' | 'none' = true,
    onProgress?: (progress: number, duration: number) => void,
    onEnded?: () => void
  ): Promise<void> {
    this.stopAll();

    if (introSound === true || introSound === 'clear') {
      await this.playAllClearChime();
    } else if (introSound === 'yellow') {
      await this.playYellowWarningTone();
    } else if (introSound === 'red') {
      await this.playRedAlertSirenTone();
    }

    if (this.isMuted) {
      if (onEnded) onEnded();
      return;
    }

    const audioUrl = `data:audio/wav;base64,${base64Audio}`;
    const audio = new Audio(audioUrl);
    this.audioElement = audio;
    audio.volume = this.volume;

    audio.ontimeupdate = () => {
      if (onProgress && audio.duration) {
        onProgress(audio.currentTime, audio.duration);
      }
    };

    audio.onended = () => {
      if (onEnded) onEnded();
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      if (onEnded) onEnded();
    };

    await audio.play();
  }

  /**
   * Download the base64 audio as a .wav file for users/broadcasters
   */
  public downloadAudio(base64Audio: string, filename: string = 'Vidbiy_Tryvogy_Gemini_TTS.wav') {
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${base64Audio}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const audioEngine = new AudioEngine();
