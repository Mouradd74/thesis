'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Option } from '@/data/onboardingQuestions';

interface BinaryChoiceProps {
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
}

export function BinaryChoice({ options, selected, onSelect }: BinaryChoiceProps) {
  const [pulsing, setPulsing] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setPulsing(value);
    onSelect(value);
    setTimeout(() => setPulsing(null), 400);
  };

  return (
    <div className="flex gap-4 w-full max-w-md mx-auto">
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        const isPulsing  = pulsing === opt.value;

        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-2xl border-2 font-semibold text-lg transition-all duration-250 cursor-pointer select-none',
              isPulsing && 'onboarding-choice-pulse',
              isSelected
                ? 'border-foreground bg-foreground/10 text-foreground shadow-lg shadow-foreground/10'
                : 'border-border bg-secondary/50 text-foreground hover:border-foreground/40 hover:bg-secondary hover:scale-105',
            )}
          >
            {opt.emoji && (
              <span className="text-4xl" role="img" aria-label={opt.label}>
                {opt.emoji}
              </span>
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
