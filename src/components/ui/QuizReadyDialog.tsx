'use client'

import { useEffect, useRef } from 'react'
import { Lock, X } from 'lucide-react'

interface QuizReadyDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function QuizReadyDialog({ open, onConfirm, onCancel }: QuizReadyDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Trap focus and handle Escape key
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    // Focus the dialog container
    dialogRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="quiz-ready-title"
        aria-describedby="quiz-ready-desc"
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border/50 bg-zinc-950 shadow-2xl
                   animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>

          {/* Title */}
          <h2 id="quiz-ready-title" className="text-xl font-bold text-foreground mb-2">
            Are you ready to take this quiz?
          </h2>

          {/* Description */}
          <p id="quiz-ready-desc" className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Once you start, <span className="text-amber-500 font-medium">lesson content and the AI Tutor will be locked</span> until
            you submit your answers. Make sure you&apos;ve reviewed the material first.
          </p>

          {/* Actions */}
          <div className="flex gap-3 mt-8 w-full">
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-xl border border-border bg-zinc-900 text-foreground text-sm font-medium
                         hover:bg-zinc-800 transition-all active:scale-[0.98]"
            >
              Not Yet
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold
                         transition-all shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30
                         active:scale-[0.98]"
            >
              Yes, I&apos;m Ready
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
