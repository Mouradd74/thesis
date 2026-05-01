'use client';

import { useCallback, useRef } from 'react';

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  /** Short tick when hovering / clicking a choice card */
  const playTick = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) { /* silently ignore */ }
  }, [getCtx]);

  /** Rising two-note chime when advancing to next question */
  const playAdvance = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25]; // C5 → E5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0, now + i * 0.09);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.09 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.12);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.15);
      });
    } catch (_) { /* silently ignore */ }
  }, [getCtx]);

  /** Three-note ascending arpeggio on completion */
  const playComplete = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5 → E5 → G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
      });
    } catch (_) { /* silently ignore */ }
  }, [getCtx]);

  /** Soft back-navigation tone */
  const playBack = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) { /* silently ignore */ }
  }, [getCtx]);

  return { playTick, playAdvance, playComplete, playBack };
}
