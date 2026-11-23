class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastShootTime = 0;
  private lastHitTime = 0;

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock() {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  public playShoot(heavy = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastShootTime < 0.065) return;
    this.lastShootTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(heavy ? 320 : 620, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 110 : 210, now + 0.065);

    gain.gain.setValueAtTime(heavy ? 0.055 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playHit() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastHitTime < 0.045) return;
    this.lastHitTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playExplosion(large = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = large ? 0.42 : 0.18;

    // Noise burst
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(large ? 900 : 1200, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(large ? 0.2 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // Sub punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(large ? 130 : 160, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + duration * 0.8);
    subGain.gain.setValueAtTime(large ? 0.22 : 0.1, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + duration);
  }

  public playPowerUp() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playEmpBomb() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.55);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.55);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);

    this.playExplosion(true);
  }

  public playPlayerDamage(shieldAbsorbed: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = shieldAbsorbed ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(shieldAbsorbed ? 480 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(shieldAbsorbed ? 190 : 55, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBossWarning() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(310, t);
      osc.frequency.linearRampToValueAtTime(420, t + 0.12);
      osc.frequency.linearRampToValueAtTime(310, t + 0.22);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, t);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  }

  public playStageClear() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880];

    chord.forEach((freq, i) => {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }
}

export const soundEngine = new SoundEngine();
