import { createClient } from '@/utils/supabase/server'
import { BookOpen, GraduationCap } from 'lucide-react'
import { LessonTabs } from './LessonTabs'
import { createExam } from '@/app/teacher/content/actions'
import { ExamPanel } from './ExamPanel'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SubjectViewer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const subjectId = params.id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subject } = await supabase.from('subjects').select('*').eq('id', subjectId).single()
  const { data: contentList } = await supabase.from('content').select('*').eq('subject_id', subjectId).order('created_at', { ascending: true })
  const { data: quizzes } = await supabase.from('quizzes').select('*').eq('subject_id', subjectId)

  // Logic for Auto-generated Exam
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes!inner(subject_id)')
    .eq('student_id', user?.id)
    .eq('quizzes.subject_id', subjectId)

  const uniqueQuizzesAttempted = new Set(quizAttempts?.map(a => a.quiz_id)).size
  let examId = null

  if (uniqueQuizzesAttempted >= 3) {
    examId = await createExam(subjectId)
  }

  const { data: examData } = examId
    ? await supabase.from('exams').select('*').eq('id', examId).single()
    : { data: null }

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
      <header className="border-b border-border/40 pb-8 flext justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{subject?.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{subject?.description}</p>
        </div>
      </header>

      {/* Personalized Exam Section */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative p-8 bg-zinc-950/90 border border-purple-500/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <GraduationCap className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Personalized Subject Exam</h2>
              <p className="text-sm text-muted-foreground">Master your weak spots with questions tailored to your previous quiz errors.</p>
            </div>
          </div>

          {!examData ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center bg-zinc-900/40 rounded-2xl border border-dashed border-border/50">
              <div className="flex items-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-2 w-12 rounded-full ${i < uniqueQuizzesAttempted ? 'bg-purple-500' : 'bg-zinc-800'}`}></div>
                ))}
              </div>
              <p className="text-muted-foreground font-medium">
                Complete <span className="text-foreground">{Math.max(0, 3 - uniqueQuizzesAttempted)}</span> more lesson quizzes to unlock your personalized exam.
              </p>
              <p className="text-xs text-zinc-600">({uniqueQuizzesAttempted}/3 Quizzes Finished)</p>
            </div>
          ) : (
            <ExamPanel examId={examData.id} questions={examData.questions} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-widest pl-2">Curriculum Modules</h3>
        {groupedLessons && Object.keys(groupedLessons).map((lessonTitle) => {
          const lessonQuiz = quizzes?.find(q => q.lesson_title === lessonTitle)
          const existingAttempt = quizAttempts?.find(a => a.quiz_id === lessonQuiz?.id)
          
          return (
            <LessonTabs
              key={lessonTitle}
              title={lessonTitle}
              items={groupedLessons[lessonTitle]}
              quiz={lessonQuiz}
              existingAttempt={existingAttempt}
            />
          )
        })}

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
