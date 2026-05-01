'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NumberInputProps {
  value: number | '';
  onChange: (val: number | '') => void;
  onSubmit: () => void;
  min?: number;
  max?: number;
  placeholder?: string;
}

export function NumberInput({ value, onChange, onSubmit, min = 5, max = 100, placeholder = 'Enter a number' }: NumberInputProps) {
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validate = (v: number | '') => {
    if (v === '') return '';
    if (v < min) return `Must be at least ${min}`;
    if (v > max) return `Must be at most ${max}`;
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') { onChange(''); setError(''); return; }
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    setError(validate(num));
    onChange(num);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const err = validate(value);
      if (err) { setError(err); return; }
      if (value !== '') onSubmit();
    }
  };

  const step = (delta: number) => {
    const cur = value === '' ? 0 : value;
    const next = Math.min(max, Math.max(min, cur + delta));
    setError('');
    onChange(next);
  };

  const isValid = value !== '' && !validate(value);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      {/* Big number display + stepper */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => step(-1)}
          className="w-12 h-12 rounded-full border border-border bg-secondary text-foreground text-2xl font-light flex items-center justify-center hover:bg-foreground hover:border-foreground hover:text-background transition-all duration-200 active:scale-95"
          aria-label="Decrease"
        >
          −
        </button>

        <div className="relative">
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder={placeholder}
            min={min}
            max={max}
            className={cn(
              'w-36 text-center text-5xl font-bold bg-transparent border-b-2 pb-2 outline-none transition-colors placeholder:text-muted-foreground/40 placeholder:text-base',
              error ? 'border-destructive text-destructive' : 'border-foreground text-foreground',
            )}
          />
        </div>

        <button
          onClick={() => step(1)}
          className="w-12 h-12 rounded-full border border-border bg-secondary text-foreground text-2xl font-light flex items-center justify-center hover:bg-foreground hover:border-foreground hover:text-background transition-all duration-200 active:scale-95"
          aria-label="Increase"
        >
          +
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-destructive text-sm animate-fade-in">{error}</p>
      )}

      {/* Continue button */}
      <button
        onClick={() => { if (value !== '' && !validate(value)) onSubmit(); }}
        disabled={!isValid}
        className={cn(
          'mt-2 px-8 py-3 rounded-full font-semibold text-base transition-all duration-300',
          isValid
            ? 'bg-foreground text-background hover:opacity-90 hover:scale-105 active:scale-95 shadow-lg shadow-foreground/20'
            : 'bg-secondary text-muted-foreground cursor-not-allowed',
        )}
      >
        Continue →
      </button>
    </div>
  );
}
