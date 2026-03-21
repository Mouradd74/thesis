import { createClient } from '@/utils/supabase/server'
import { BookOpen } from 'lucide-react'
import { LessonTabs } from './LessonTabs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SubjectViewer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const subjectId = params.id
  
  const supabase = await createClient()

  const { data: subject } = await supabase.from('subjects').select('*').eq('id', subjectId).single()
  const { data: contentList } = await supabase.from('content').select('*').eq('subject_id', subjectId).order('created_at', { ascending: true })

  // Group content sequentially by title (Lessons)
  const groupedLessons = contentList?.reduce((acc: any, content: any) => {
    if (!acc[content.title]) {
      acc[content.title] = []
    }
    acc[content.title].push(content)
    return acc
  }, {})

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-4xl mx-auto">
      <header className="border-b border-border/40 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{subject?.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{subject?.description}</p>
      </header>

      <div className="flex flex-col gap-8">
        {groupedLessons && Object.keys(groupedLessons).map((lessonTitle) => (
          <LessonTabs key={lessonTitle} title={lessonTitle} items={groupedLessons[lessonTitle]} />
        ))}

        {(!contentList || contentList.length === 0) && (
          <div className="flex h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/50 bg-zinc-950/30">
            <BookOpen className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground font-medium">No curriculum modules have been generated for this subject yet!</p>
          </div>
        )}
      </div>
    </div>
  )
}
