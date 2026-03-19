import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Disc, FileText, Play, PlayCircle, Video } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SubjectViewer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const subjectId = params.id
  
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: enrollment } = await supabase.from('enrollments').select('*').eq('student_id', user?.id).eq('subject_id', subjectId).single()

  if (!enrollment) {
    redirect('/student')
  }

  const { data: subject } = await supabase.from('subjects').select('*').eq('id', subjectId).single()
  const { data: contentList } = await supabase.from('content').select('*').eq('subject_id', subjectId).order('created_at', { ascending: true })

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-4xl mx-auto">
      <header className="border-b border-border/40 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{subject?.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{subject?.description}</p>
      </header>

      <div className="flex flex-col gap-6">
        {contentList?.map(content => (
          <Card key={content.id} className="overflow-hidden bg-zinc-950/40 border-border/50 transition-all hover:bg-zinc-950/60 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 border-b border-border/40 px-6 py-4 bg-zinc-900/20">
                {content.type === 'video' && <Video className="h-5 w-5 text-emerald-500" />}
                {content.type === 'audio' && <Disc className="h-5 w-5 text-amber-500" />}
                {content.type === 'text' && <FileText className="h-5 w-5 text-blue-500" />}
                <h2 className="text-lg font-semibold tracking-tight">{content.title}</h2>
              </div>

              <div className="p-6">
                {content.type === 'video' && content.url && (
                  <div className="relative w-full overflow-hidden rounded-xl bg-black border border-border/50 aspect-video flex items-center justify-center group cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <div className="absolute inset-0 transition-opacity bg-emerald-500/10 opacity-0 group-hover:opacity-100"></div>
                    <PlayCircle className="h-16 w-16 text-white/50 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-300" />
                    <span className="absolute bottom-4 left-4 text-xs font-semibold text-white/50 bg-black/50 px-2 py-1 rounded backdrop-blur-md">{content.url}</span>
                  </div>
                )}

                {content.type === 'audio' && content.url && (
                  <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-zinc-900/50 p-4">
                    <button className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white transition-transform hover:scale-105 hover:bg-amber-600 shadow-lg shadow-amber-500/20">
                      <Play className="h-5 w-5 ml-1" />
                    </button>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                        <span>0:00</span>
                        <span>{content.url}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full w-1/4 rounded-full bg-amber-500"></div>
                      </div>
                    </div>
                  </div>
                )}

                {content.type === 'text' && (
                  <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground leading-relax text-[15px]">
                    {content.body || 'No textual material provided yet.'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!contentList || contentList.length === 0) && (
          <div className="flex h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/50 bg-zinc-950/30">
            <BookOpen className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground font-medium">No curriculum content has been uploaded for this subject yet!</p>
          </div>
        )}
      </div>
    </div>
  )
}
