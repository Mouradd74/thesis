'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Disc, FileText, PlayCircle, Video, CheckCircle2 } from 'lucide-react'
import { QuizPanel } from './QuizPanel'

export function LessonTabs({ title, items, quiz, existingAttempt }: { 
  title: string, 
  items: any[], 
  quiz?: any,
  existingAttempt?: any
}) {
  const [activeType, setActiveType] = useState('video')

  const availableTypes = items.map(i => i.type)
  const activeContent = items.find(i => i.type === activeType) || items[0]

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
        <div className="mt-4 flex gap-2">
          {availableTypes.includes('video') && (
            <button onClick={() => setActiveType('video')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeType === 'video' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'}`}>
              <Video className="h-4 w-4" /> Video
            </button>
          )}
          {availableTypes.includes('text') && (
            <button onClick={() => setActiveType('text')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeType === 'text' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'}`}>
              <FileText className="h-4 w-4" /> Text
            </button>
          )}
          {availableTypes.includes('audio') && (
             <button onClick={() => setActiveType('audio')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeType === 'audio' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'}`}>
               <Disc className="h-4 w-4" /> Audio
             </button>
          )}
          {quiz && (
             <button onClick={() => setActiveType('quiz')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeType === 'quiz' ? 'bg-purple-500/20 text-purple-500 border border-purple-500/20' : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700 border border-transparent'}`}>
               <CheckCircle2 className={`h-4 w-4 ${existingAttempt ? 'text-emerald-500 fill-emerald-500/10' : ''}`} /> Quiz
               {existingAttempt && <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-500 ml-1">{existingAttempt.score}%</span>}
             </button>
          )}
        </div>
      </div>

      <CardContent className="p-6">
        {activeType === 'quiz' && quiz ? (
          <QuizPanel quizId={quiz.id} questions={quiz.questions} existingAttempt={existingAttempt} />
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
                 <audio controls className="w-full" src={activeContent.url} />
               </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
