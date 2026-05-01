'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  section: string;
}

export function ProgressBar({ current, total, section }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Thin fill bar */}
      <div className="h-1 w-full bg-border">
        <div
          className="h-full bg-foreground transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between px-6 py-3 backdrop-blur-sm bg-background/60">
        <span className="text-xs text-muted-foreground font-medium tracking-wide">
          Question <span className="text-foreground">{current + 1}</span> of {total}
        </span>

        <span
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-full border',
            'border-foreground/20 bg-foreground/5 text-foreground',
          )}
        >
          {section}
        </span>
      </div>
    </div>
  );
}
