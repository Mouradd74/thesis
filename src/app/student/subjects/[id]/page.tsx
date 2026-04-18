import { createClient } from '@/utils/supabase/server'
import { BookOpen, GraduationCap, Brain, BarChart3 } from 'lucide-react'
import { LessonTabs } from './LessonTabs'
import { getBanditRecommendation, getLearningStyleProfile } from '@/app/student/learning-style/actions'
import { LearningStyleBadge } from '@/components/ui/LearningStyleBadge'
import { Suspense } from 'react'
import { MLInsightsPanelSuspense } from '@/components/suspense/MLInsightsPanelSuspense'
import { ExamSectionSuspense } from '@/components/suspense/ExamSectionSuspense'


export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SubjectViewer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const subjectId = params.id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [subjectResult, contentListResult, quizzesResult, quizAttemptsResult, profileResult, recommendedTypeResult] = await Promise.all([
    supabase.from('subjects').select('*').eq('id', subjectId).single(),
    supabase.from('content').select('*').eq('subject_id', subjectId).order('created_at', { ascending: true }),
    supabase.from('quizzes').select('*').eq('subject_id', subjectId),
    supabase.from('quiz_attempts').select('*, quizzes!inner(subject_id)').eq('student_id', user?.id).eq('quizzes.subject_id', subjectId),
    user ? getLearningStyleProfile(user.id, subjectId) : Promise.resolve(null),
    user ? getBanditRecommendation(user.id, subjectId) : Promise.resolve('video')
  ])

  const subject = subjectResult.data
  const contentList = contentListResult.data
  const quizzes = quizzesResult.data
  const quizAttempts = quizAttemptsResult.data
  const profile = profileResult

  // Group content sequentially by title (Lessons)
  const groupedLessons = contentList?.reduce((acc: any, content: any) => {
    if (!acc[content.title]) {
      acc[content.title] = []
    }
    acc[content.title].push(content)
    return acc
  }, {})

  let recommendedType = recommendedTypeResult
  if (profile?.predicted_style) {
    if (profile.predicted_style === 'visual') recommendedType = 'video'
    else if (profile.predicted_style === 'auditory') recommendedType = 'audio'
    else if (profile.predicted_style === 'reading') recommendedType = 'text'
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
      <Suspense fallback={
        <div className="p-6 bg-zinc-950/60 border border-cyan-500/20 rounded-2xl animate-pulse h-48 flex items-center justify-center">
           <p className="text-sm text-cyan-400 flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-cyan-400/20 animate-spin border-t-2 border-cyan-400" />
            Loading neural knowledge tracing models...
          </p>
        </div>
      }>
        <MLInsightsPanelSuspense subjectId={subjectId} />
      </Suspense>

      {/* Personalized Exam Section */}
      <Suspense fallback={
         <div className="relative p-8 bg-zinc-950/90 border border-purple-500/20 rounded-3xl overflow-hidden shadow-2xl animate-pulse h-64 flex items-center justify-center">
            <p className="text-sm text-purple-400 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-purple-400/20 animate-spin border-t-2 border-purple-400" />
              Evaluating adaptive exam readiness...
            </p>
         </div>
      }>
        <ExamSectionSuspense subjectId={subjectId} />
      </Suspense>

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
