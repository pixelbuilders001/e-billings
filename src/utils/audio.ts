/**
 * Utility to play a professional POS-style beep sound.
 * Uses Web Audio API oscillator synthesis with fallback to /sound.wav
 */
export function playBeep() {
  try {
    const audio = new Audio('/sound.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Fallback synthetic beep using Web Audio API
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz POS beep
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      } catch (e) {
        // Audio error silent fallback
      }
    });
  } catch (error) {
    // Ignore audio error
  }
}
