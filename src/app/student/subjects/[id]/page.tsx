import { createClient } from '@/utils/supabase/server'
import { BookOpen, GraduationCap, Brain, BarChart3 } from 'lucide-react'
import { LessonTabs } from './LessonTabs'
import { createExam } from '@/app/teacher/content/actions'
import { ExamPanel } from './ExamPanel'
import { getBanditRecommendation, getLearningStyleProfile } from '@/app/student/learning-style/actions'
import { LearningStyleBadge } from '@/components/ui/LearningStyleBadge'
import { predictMastery, checkMLHealth } from '@/lib/mlClient'


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

  // ML Platform: Fetch recommendations and profile
  const profile = user ? await getLearningStyleProfile(user.id, subjectId) : null
  
  let recommendedType = 'video'
  if (profile?.predicted_style) {
    if (profile.predicted_style === 'visual') recommendedType = 'video'
    else if (profile.predicted_style === 'auditory') recommendedType = 'audio'
    else if (profile.predicted_style === 'reading') recommendedType = 'text'
    else if (profile.predicted_style === 'undetermined' && user) {
      recommendedType = await getBanditRecommendation(user.id, subjectId)
    }
  } else if (user) {
    recommendedType = await getBanditRecommendation(user.id, subjectId)
  }

  // BKT Mastery from Supabase
  const { data: bktStates } = user
    ? await supabase.from('knowledge_states').select('concept, p_mastery').eq('student_id', user.id).eq('subject_id', subjectId)
    : { data: null }

  // DKT Mastery from Python ML service
  let dktPrediction: { mastery_probabilities: Record<string, number>; overall_mastery: number } | null = null
  const mlHealth = await checkMLHealth()
  if (mlHealth?.dkt_loaded && quizAttempts && quizAttempts.length > 0) {
    // Hash a lesson title to a consistent skill_id in [0, 122]
    // This ensures each unique lesson always maps to the same skill slot
    const hashLesson = (title: string): number => {
      let hash = 0
      for (let i = 0; i < title.length; i++) {
        hash = ((hash << 5) - hash) + title.charCodeAt(i)
        hash |= 0 // Convert to 32-bit integer
      }
      return Math.abs(hash) % 123 // 123 = number of skills the DKT model knows
    }

    // Build interaction sequence from quiz attempts for the DKT model
    const interactions: { skill_id: number; correct: boolean }[] = []
    quizAttempts.forEach((attempt: any) => {
      const quiz = quizzes?.find((q: any) => q.id === attempt.quiz_id)
      if (quiz?.questions && quiz.lesson_title) {
        const lessonSkillId = hashLesson(quiz.lesson_title)
        quiz.questions.forEach((q: any, idx: number) => {
          interactions.push({
            skill_id: lessonSkillId,
            correct: attempt.answers[idx] === q.answer,
          })
        })
      }
    })
    if (interactions.length > 0) {
      dktPrediction = await predictMastery(interactions)
    }
  }


  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-4xl mx-auto">
      <header className="border-b border-border/40 pb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{subject?.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{subject?.description}</p>
        </div>
        <div>
          {profile && (
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Style Profile</span>
              <LearningStyleBadge style={profile.predicted_style as any} confidence={profile.confidence} />
            </div>
          )}
        </div>
      </header>

      {/* ML Insights Panel */}
      {(bktStates && bktStates.length > 0) || dktPrediction ? (
        <div className="p-6 bg-zinc-950/60 border border-cyan-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Brain className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">ML Mastery Insights</h2>
              <p className="text-xs text-muted-foreground">Comparing Bayesian Knowledge Tracing vs. Deep Knowledge Tracing (LSTM)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BKT Column */}
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">BKT (TypeScript)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 ml-auto">Heuristic</span>
              </div>
              {bktStates && bktStates.length > 0 ? (
                <div className="space-y-2">
                  {bktStates.map((state: any) => (
                    <div key={state.concept} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground truncate flex-1">{state.concept}</span>
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.round(state.p_mastery * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-foreground w-10 text-right">{Math.round(state.p_mastery * 100)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Complete quizzes to generate BKT mastery data.</p>
              )}
            </div>

            {/* DKT Column */}
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-400">DKT (PyTorch LSTM)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 ml-auto">Neural Net</span>
              </div>
              {dktPrediction ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-muted-foreground">Overall Mastery</span>
                    <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${Math.round(dktPrediction.overall_mastery * 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-foreground w-10 text-right">{Math.round(dktPrediction.overall_mastery * 100)}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Based on {quizAttempts?.length || 0} quiz attempts analyzed by LSTM</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {mlHealth?.dkt_loaded
                    ? 'Complete quizzes to generate DKT predictions.'
                    : 'DKT model not loaded — start the ML server.'}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
          // Extract the study guide text body to use as chatbot context
          const textItem = groupedLessons[lessonTitle].find((i: any) => i.type === 'text')
          const lessonContext = textItem?.body || ''
          
          return (
            <LessonTabs
              key={lessonTitle}
              subjectId={subjectId}
              title={lessonTitle}
              items={groupedLessons[lessonTitle]}
              quiz={lessonQuiz}
              existingAttempt={existingAttempt}
              recommendedType={recommendedType}
              lessonContext={lessonContext}
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
