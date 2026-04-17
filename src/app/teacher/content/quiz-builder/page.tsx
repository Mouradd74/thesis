import { createClient } from '@/utils/supabase/server'
import { QuizBuilderClient } from './QuizBuilderClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function QuizBuilderPage() {
  const supabase = await createClient()

  // Verify the requesting user is a teacher
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: teacherProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (teacherProfile?.role !== 'teacher') return notFound()

  const { data: subjects } = await supabase.from('subjects').select('id, title').eq('teacher_id', user.id)

  if (!subjects || subjects.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Smart Quiz Builder</h1>
          <p className="mt-2 text-muted-foreground">Identify knowledge gaps and generate targeted assessments.</p>
        </div>
        <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
          <p className="text-sm text-muted-foreground">You must create a subject first under Curriculum before building quizzes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Smart Quiz Builder</h1>
        <p className="mt-2 text-muted-foreground">Use AI and IRT item calibration to build assessments targeting class-wide knowledge gaps.</p>
      </div>

      <QuizBuilderClient subjects={subjects} />
    </div>
  )
}
