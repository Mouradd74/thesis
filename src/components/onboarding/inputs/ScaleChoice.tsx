'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Option } from '@/data/onboardingQuestions';

interface ScaleChoiceProps {
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
}

const TINTS = [
  'hover:border-emerald-500/50 data-[selected]:border-emerald-500 data-[selected]:bg-emerald-500/15 data-[selected]:text-emerald-400 data-[selected]:shadow-emerald-500/20',
  'hover:border-zinc-400/50 data-[selected]:border-zinc-300 data-[selected]:bg-zinc-300/15 data-[selected]:text-zinc-200 data-[selected]:shadow-zinc-300/20',
  'hover:border-rose-500/50 data-[selected]:border-rose-500 data-[selected]:bg-rose-500/15 data-[selected]:text-rose-400 data-[selected]:shadow-rose-500/20',
];

export function ScaleChoice({ options, selected, onSelect }: ScaleChoiceProps) {
  const [pulsing, setPulsing] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setPulsing(value);
    onSelect(value);
    setTimeout(() => setPulsing(null), 400);
  };

  return (
    <div className="flex gap-3 w-full max-w-lg mx-auto">
      {options.map((opt, i) => {
        const isSelected = selected === opt.value;
        const isPulsing  = pulsing === opt.value;

        return (
          <button
            key={opt.value}
            data-selected={isSelected ? '' : undefined}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-3 py-7 px-3 rounded-2xl border-2 font-semibold text-base transition-all duration-200 cursor-pointer select-none',
              'border-border bg-secondary/50 text-foreground',
              isPulsing && 'onboarding-choice-pulse',
              isSelected
                ? `shadow-lg ${TINTS[i]}`
                : `hover:scale-105 hover:bg-secondary ${TINTS[i]}`,
            )}
          >
            {opt.emoji && (
              <span className="text-4xl" role="img" aria-label={opt.label}>
                {opt.emoji}
              </span>
            )}
            <span className="text-sm leading-tight text-center">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
