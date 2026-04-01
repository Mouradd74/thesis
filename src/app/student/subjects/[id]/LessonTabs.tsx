'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Disc, FileText, PlayCircle, Video, CheckCircle2, Sparkles } from 'lucide-react'
import { QuizPanel } from './QuizPanel'
import { LessonChat } from './LessonChat'
import { logInteraction } from '@/app/student/learning-style/actions'
import { EventType } from '@/lib/naiveBayes'

export function LessonTabs({ subjectId, title, items, quiz, existingAttempt, recommendedType, lessonContext }: { 
  subjectId: string,
  title: string, 
  items: any[], 
  quiz?: any,
  existingAttempt?: any,
  recommendedType?: string,
  lessonContext?: string
}) {
  const availableTypes = items.map(i => i.type)
  const [activeType, setActiveType] = useState(
    recommendedType && availableTypes.includes(recommendedType) 
      ? recommendedType 
      : 'video'
  )

  const activeContent = items.find(i => i.type === activeType) || items[0]

  // Track the last content type the student viewed (for bandit reward)
  const [lastViewedContentType, setLastViewedContentType] = useState<string>(
    recommendedType && availableTypes.includes(recommendedType) ? recommendedType : 'video'
  )

  // Track if we already logged the open event to avoid spamming
  const [loggedViews, setLoggedViews] = useState<Set<string>>(new Set())

  function handleTabChange(type: string) {
    setActiveType(type)
    // Track last viewed content type for bandit reward (not quiz)
    if (type !== 'quiz') {
      setLastViewedContentType(type)
    }
    if (type !== 'quiz' && !loggedViews.has(type)) {
      setLoggedViews(prev => new Set(prev).add(type))
      // It's technically reopening if we come back to it, but for simplicity we log 'content_open_type'
      let eventType: EventType | null = null
      if (type === 'video') eventType = 'content_open_video'
      if (type === 'audio') eventType = 'content_open_audio'
      if (type === 'text') eventType = 'content_open_text'
      if (eventType) {
        logInteraction(subjectId, eventType, type)
      }
    } else if (type !== 'quiz') {
      // It's a reopen
      logInteraction(subjectId, 'content_reopen', type)
    }
  }

  function handleAudioPlay() {
    logInteraction(subjectId, 'content_open_audio', 'audio')
  }


  // Fix YouTube URLs for iframe embeds
  function getEmbedUrl(url: string) {
    if (!url) return ''
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/')
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/')
    }
    return url
  }

  return (
    <Card className="overflow-hidden bg-zinc-950/40 border-border/50 transition-all shadow-sm">
      <div className="border-b border-border/40 bg-zinc-900/20 px-6 py-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Bandit Recommendation System Reordering */}
          {['video', 'audio', 'text', 'quiz'].map((type) => {
            const isAvailable = type === 'quiz' ? !!quiz : availableTypes.includes(type)
            if (!isAvailable) return null

            const isActive = activeType === type
            const isRecommended = recommendedType === type && type !== 'quiz'
            
            let btnClass = 'px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 whitespace-nowrap '
            let icon = null

            if (type === 'video') {
              btnClass += isActive ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
              icon = <Video className="h-4 w-4" />
            } else if (type === 'text') {
              btnClass += isActive ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
              icon = <FileText className="h-4 w-4" />
            } else if (type === 'audio') {
              btnClass += isActive ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
              icon = <Disc className="h-4 w-4" />
            } else if (type === 'quiz') {
              btnClass += isActive ? 'bg-purple-500/20 text-purple-500 border border-purple-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
              icon = <CheckCircle2 className={`h-4 w-4 ${existingAttempt ? 'text-emerald-500 fill-emerald-500/10' : ''}`} />
            }

            // Capitalize first letter
            const label = type.charAt(0).toUpperCase() + type.slice(1)

            // Reorder: if it's the recommended type, we render it first by cheating with flex-order mapping, 
            // but it's simpler to just map a sorted array:
            return null // we will do sorting before map
          })}

          {
            // Sorting array putting recommendedType first
            ['video', 'audio', 'text', 'quiz']
              .filter(type => type === 'quiz' ? !!quiz : availableTypes.includes(type))
              .sort((a, b) => {
                if (a === recommendedType) return -1
                if (b === recommendedType) return 1
                return 0
              })
              .map((type) => {
                const isActive = activeType === type
                const isRecommended = recommendedType === type && type !== 'quiz'
                
                let btnClass = 'px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 whitespace-nowrap relative '
                let icon = null

                if (type === 'video') {
                  btnClass += isActive ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
                  icon = <Video className="h-4 w-4" />
                } else if (type === 'text') {
                  btnClass += isActive ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
                  icon = <FileText className="h-4 w-4" />
                } else if (type === 'audio') {
                  btnClass += isActive ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
                  icon = <Disc className="h-4 w-4" />
                } else if (type === 'quiz') {
                  btnClass += isActive ? 'bg-purple-500/20 text-purple-500 border border-purple-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'
                  icon = <CheckCircle2 className={`h-4 w-4 ${existingAttempt ? 'text-emerald-500 fill-emerald-500/10' : ''}`} />
                }

                const label = type.charAt(0).toUpperCase() + type.slice(1)

                return (
                  <button 
                    key={type} 
                    onClick={() => handleTabChange(type)} 
                    className={btnClass}
                  >
                    {isRecommended && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                    {icon} 
                    {label}
                    {isRecommended && <Sparkles className="h-3 w-3 ml-1 text-emerald-400" />}
                    {type === 'quiz' && existingAttempt && <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-500 ml-1">{existingAttempt.score}%</span>}
                  </button>
                )
              })
          }
        </div>
      </div>

      <CardContent className="p-6">
        {activeType === 'quiz' && quiz ? (
          <QuizPanel subjectId={subjectId} quizId={quiz.id} questions={quiz.questions} existingAttempt={existingAttempt} lastViewedContentType={lastViewedContentType} />
        ) : (
          <>
            {activeContent?.type === 'video' && activeContent.url && (
               <div className="w-full overflow-hidden rounded-xl bg-black border border-border/50 aspect-video flex items-center justify-center group">
                   {activeContent.url.includes('youtube') || activeContent.url.includes('youtu.be') ? (
                     <iframe className="w-full h-full" src={getEmbedUrl(activeContent.url)} allowFullScreen></iframe>
                   ) : (
                     <div className="relative w-full h-full flex items-center justify-center">
                        <PlayCircle className="h-16 w-16 text-white/50 group-hover:text-emerald-500 transition-all duration-300" />
                     </div>
                   )}
               </div>
            )}

            {activeContent?.type === 'text' && (
               <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-[15px]">
                  {activeContent.body || 'No text extracted for this module.'}
               </div>
            )}

            {activeContent?.type === 'audio' && activeContent.url && (
               <div className="flex flex-col gap-4">
                 <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm font-medium">
                   🎧 AI Synthesized Lesson Audio
                 </div>
                 <audio onPlay={handleAudioPlay} controls className="w-full" src={activeContent.url} />
               </div>
            )}
          </>
        )}

        {/* AI Tutor Chat */}
        {lessonContext && (
          <div className="mt-6 pt-6 border-t border-border/30">
            <LessonChat lessonContext={lessonContext} lessonTitle={title} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
