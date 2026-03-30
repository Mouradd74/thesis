'use client'

import { BrainCircuit, BookOpen, Headphones, HelpCircle } from 'lucide-react'
import { LearningStyle } from '@/lib/naiveBayes'

interface LearningStyleBadgeProps {
  style: LearningStyle
  confidence: number
}

const STYLE_CONFIG: Record<LearningStyle, { label: string, color: string, icon: React.ReactNode }> = {
  visual: {
    label: 'Visual',
    color: 'bg-purple-500/10 border-purple-500/50 text-purple-500',
    icon: <BrainCircuit className="w-4 h-4 mr-1.5" />
  },
  auditory: {
    label: 'Auditory',
    color: 'bg-blue-500/10 border-blue-500/50 text-blue-500',
    icon: <Headphones className="w-4 h-4 mr-1.5" />
  },
  reading: {
    label: 'Reading/Writing',
    color: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500',
    icon: <BookOpen className="w-4 h-4 mr-1.5" />
  },
  undetermined: {
    label: 'Undetermined',
    color: 'bg-zinc-800 border-zinc-700 text-zinc-400',
    icon: <HelpCircle className="w-4 h-4 mr-1.5" />
  }
}

export function LearningStyleBadge({ style, confidence }: LearningStyleBadgeProps) {
  const config = STYLE_CONFIG[style] || STYLE_CONFIG['undetermined']

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${config.color}`}>
      {config.icon}
      <span>{config.label}</span>
      {style !== 'undetermined' && (
        <span className="ml-2 pl-2 border-l border-current/30 text-xs opacity-80">
          {confidence}% conf
        </span>
      )}
    </div>
  )
}
