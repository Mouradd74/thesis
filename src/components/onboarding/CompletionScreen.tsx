'use client';

import { useEffect, useState } from 'react';
import { QUESTIONS, SECTION_COLORS, type QuestionId } from '@/data/onboardingQuestions';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';

type Answers = Partial<Record<QuestionId, string | number>>;

interface CompletionScreenProps {
  answers: Answers;
  onRestart: () => void;
  onComplete: () => void;
  isSaving: boolean;
}

const SECTIONS = Array.from(new Set(QUESTIONS.map((q) => q.section)));

const LABEL_MAP: Record<string, string> = {
  female: 'Female 👩', male: 'Male 👨',
  yes: 'Yes ✅', no: 'No ❌',
  rarely: 'Rarely 😴', sometimes: 'Sometimes 📚', frequently: 'Frequently 🚀',
  low: 'Low', moderate: 'Moderate', high: 'High',
};

const CONFETTI_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#fb923c'];

function Confetti() {
  const particles = Array.from({ length: 36 }, (_, i) => i);
  return (
    <>
      {particles.map((i) => (
        <div
          key={i}
          className="onboarding-confetti-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${-20 - Math.random() * 40}px`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            animationDuration: `${2.5 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 1}s`,
          }}
        />
      ))}
    </>
  );
}

export function CompletionScreen({ answers, onRestart, onComplete, isSaving }: CompletionScreenProps) {
  const { playComplete } = useSoundEffects();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    playComplete();
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-20">
      <Confetti />

      {/* Animated checkmark */}
      <div className={cn('mb-8 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
        <div className="onboarding-check-circle w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="#d4d4d8"
              strokeWidth="4"
              opacity="0.3"
            />
            <circle
              cx="50" cy="50" r="46"
              fill="rgba(212, 212, 216, 0.1)"
            />
            <path
              className="onboarding-check-path"
              d="M28 52 L44 68 L72 36"
              fill="none"
              stroke="#fafafa"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <div className={cn('text-center mb-10 transition-all duration-700 delay-150', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
        <h1 className="text-4xl font-bold text-foreground mb-2">You&apos;re all set! 🎉</h1>
        <p className="text-muted-foreground text-lg">Your learning profile is ready. Here&apos;s a summary of your answers.</p>
      </div>

      {/* Summary card with shimmer border */}
      <div className={cn('relative w-full max-w-xl rounded-2xl transition-all duration-700 delay-300', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
        {/* Shimmer border layer */}
        <div className="absolute inset-0 rounded-2xl p-[1.5px] onboarding-shimmer-border" aria-hidden>
          <div className="w-full h-full rounded-2xl bg-background" />
        </div>

        {/* Card content */}
        <div className="relative rounded-2xl bg-zinc-950/80 backdrop-blur-sm p-6 space-y-5 border border-border/30">
          {SECTIONS.map((section) => {
            const sectionQs = QUESTIONS.filter((q) => q.section === section);
            return (
              <div key={section}>
                <h2
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: SECTION_COLORS[section] ?? '#fafafa' }}
                >
                  {section}
                </h2>
                <div className="space-y-2">
                  {sectionQs.map((q) => {
                    const raw = answers[q.id];
                    const display =
                      raw === undefined ? '—'
                      : typeof raw === 'number' ? `${raw} years old`
                      : LABEL_MAP[raw] ?? raw;
                    return (
                      <div key={q.id} className="flex items-start justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
                        <span className="text-sm text-muted-foreground leading-tight">{q.question}</span>
                        <span className="text-sm font-semibold text-foreground shrink-0">{display}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className={cn('flex flex-col sm:flex-row gap-3 mt-8 transition-all duration-700 delay-500', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
        <button
          onClick={onRestart}
          disabled={isSaving}
          className="px-6 py-3 rounded-full border border-border bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-all active:scale-95 disabled:opacity-50"
        >
          ↺ Start Over
        </button>
        <button
          onClick={onComplete}
          disabled={isSaving}
          className="px-8 py-3 rounded-full bg-foreground text-background font-semibold shadow-lg shadow-foreground/10 hover:opacity-90 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Continue to Dashboard →'}
        </button>
      </div>
    </div>
  );
}
