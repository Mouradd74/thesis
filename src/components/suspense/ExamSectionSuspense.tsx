import { createClient } from '@/utils/supabase/server'
import { GraduationCap } from 'lucide-react'
import { createExam } from '@/app/teacher/content/actions'
import { ExamPanel } from '@/app/student/subjects/[id]/ExamPanel'
import { AdaptiveExamPanel } from '@/app/student/subjects/[id]/AdaptiveExamPanel'

export async function ExamSectionSuspense({ subjectId }: { subjectId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch quiz attempts to see if they qualify for the exam
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('quiz_id')
    .eq('student_id', user.id)
  
  // Note: Since we don't have the subject join here easily, we rely on createExam's internal check or a simpler check here
  // Actually, let's fetch attempts properly for this subject:
  const { data: subjectAttempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes!inner(subject_id)')
    .eq('student_id', user.id)
    .eq('quizzes.subject_id', subjectId)

  const uniqueQuizzesAttempted = new Set(subjectAttempts?.map(a => a.quiz_id)).size
  let examId = null

  // createExam is slow (OpenAI calls etc). This is why it's Suspensed!
  if (uniqueQuizzesAttempted >= 3) {
    examId = await createExam(subjectId)
  }

  const { data: examData } = examId
    ? await supabase.from('exams').select('*').eq('id', examId).single()
    : { data: null }

  const isAdaptiveExam = examData?.is_adaptive === true

  return (
    <div className="relative group animate-in fade-in duration-700">
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative p-8 bg-zinc-950/90 border border-purple-500/20 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
            <GraduationCap className="h-8 w-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Adaptive Ability Assessment</h2>
            <p className="text-sm text-muted-foreground">IRT-powered Computerized Adaptive Test — difficulty adjusts to your ability in real-time.</p>
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
              Complete <span className="text-foreground">{Math.max(0, 3 - uniqueQuizzesAttempted)}</span> more lesson quizzes to unlock the adaptive exam.
            </p>
            <p className="text-xs text-zinc-600">({uniqueQuizzesAttempted}/3 Quizzes Finished)</p>
          </div>
        ) : isAdaptiveExam ? (
          <AdaptiveExamPanel examId={examData.id} initialTheta={examData.initial_theta || 0} />
        ) : (
          <ExamPanel examId={examData.id} questions={examData.questions} />
        )}
      </div>
    </div>
  )
}
