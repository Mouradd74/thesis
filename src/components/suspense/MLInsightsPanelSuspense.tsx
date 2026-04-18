import { createClient } from '@/utils/supabase/server'
import { Brain, BarChart3 } from 'lucide-react'
import { predictMastery, checkMLHealth } from '@/lib/mlClient'

export async function MLInsightsPanelSuspense({ subjectId }: { subjectId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch BKT States and Quizzes/Attempts in parallel
  const [bktStatesResult, quizzesResult, quizAttemptsResult, mlHealth] = await Promise.all([
    supabase.from('knowledge_states').select('concept, p_mastery').eq('student_id', user.id).eq('subject_id', subjectId),
    supabase.from('quizzes').select('*').eq('subject_id', subjectId),
    supabase.from('quiz_attempts').select('*, quizzes!inner(subject_id)').eq('student_id', user.id).eq('quizzes.subject_id', subjectId),
    checkMLHealth()
  ])

  const bktStates = bktStatesResult.data
  const quizzes = quizzesResult.data
  const quizAttempts = quizAttemptsResult.data

  let dktPrediction = null

  if (mlHealth?.dkt_loaded && quizAttempts && quizAttempts.length > 0) {
    const hashLesson = (title: string): number => {
      let hash = 0
      for (let i = 0; i < title.length; i++) {
        hash = ((hash << 5) - hash) + title.charCodeAt(i)
        hash |= 0
      }
      return Math.abs(hash) % 123
    }

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

  if ((!bktStates || bktStates.length === 0) && !dktPrediction) {
    return null
  }

  return (
    <div className="p-6 bg-zinc-950/60 border border-cyan-500/20 rounded-2xl animate-in fade-in duration-500">
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
  )
}
