import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Brain, ListTodo, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, Presentation } from 'lucide-react'
import { predictMastery, predictLearningStyle } from '@/lib/mlClient'
import { LearningStyleBadge } from '@/components/ui/LearningStyleBadge'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Hash function to map lesson titles to DKT skill IDs (consistent with subject/[id]/page.tsx)
const hashLesson = (title: string): number => {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 123
}

export default async function AdaptiveTodoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // 1. Base Data Fetches
  const { data: enrollments } = await supabase.from('enrollments').select('subject_id').eq('student_id', user.id)
  const enrolledSubjectIds = enrollments?.map(e => e.subject_id) || []

  const { data: subjects } = await supabase.from('subjects').select('*').in('id', enrolledSubjectIds)
  const { data: contentList } = await supabase.from('content').select('*').in('subject_id', enrolledSubjectIds).order('created_at', { ascending: true })
  const { data: quizzes } = await supabase.from('quizzes').select('*').in('subject_id', enrolledSubjectIds)
  const { data: quizAttempts } = await supabase.from('quiz_attempts').select('*').eq('student_id', user.id)

  const { data: exams } = await supabase.from('exams').select('*').in('subject_id', enrolledSubjectIds)
  const { data: examAttempts } = await supabase.from('exam_attempts').select('*').eq('student_id', user.id)
  
  // Learning style prediction for whole student
  const { data: studentInteractions } = await supabase
    .from('student_interactions')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: true })
        
  let styleProfile = null;
  if (studentInteractions && studentInteractions.length > 0) {
    styleProfile = await predictLearningStyle(user.id, studentInteractions)
  }

  // 2. Build task list
  const tasks: any[] = []
  const subjectMasteryCache: Record<string, number> = {}

  if (subjects) {
    for (const subject of subjects) {
      // Find content for this subject and group by lesson title
      const subjectContent = contentList?.filter(c => c.subject_id === subject.id) || []
      const subjectQuizzes = quizzes?.filter(q => q.subject_id === subject.id) || []
      const subjectAttempts = quizAttempts?.filter(a => subjectQuizzes.some(sq => sq.id === a.quiz_id)) || []
      
      const uniqueLessons = [...new Set(subjectContent.map(c => c.title))]
      
      // Calculate DKT Mastery for this subject
      let masteryProbabilities: Record<string, number> = {}
      if (subjectAttempts.length > 0) {
        const dktInteractions: { skill_id: number; correct: boolean }[] = []
        subjectAttempts.forEach(attempt => {
            const quiz = subjectQuizzes.find(q => q.id === attempt.quiz_id)
            if (quiz?.questions && quiz.lesson_title) {
                const lessonSkillId = hashLesson(quiz.lesson_title)
                quiz.questions.forEach((q: any, idx: number) => {
                    dktInteractions.push({
                        skill_id: lessonSkillId,
                        correct: attempt.answers[idx] === q.answer,
                    })
                })
            }
        })
        if (dktInteractions.length > 0) {
            const masteryRes = await predictMastery(dktInteractions)
            if (masteryRes) {
                masteryProbabilities = masteryRes.mastery_probabilities
                subjectMasteryCache[subject.id] = masteryRes.overall_mastery
            }
        }
      }

      // Check which lessons are complete
      // A lesson is complete if its quiz has been attempted. 
      // If a lesson has no quiz yet, it's pending if user hasn't seen it, but we'll use quiz attempts as the strict definition of 'completion'.
      let nextUnseenLessonFound = false;

      for (const lessonTitle of uniqueLessons) {
          const lessonQuiz = subjectQuizzes.find(q => q.lesson_title === lessonTitle)
          const isCompleted = lessonQuiz ? subjectAttempts.some(a => a.quiz_id === lessonQuiz.id) : false
          const skillId = hashLesson(lessonTitle)
          const mastery = masteryProbabilities[skillId.toString()] || 0

          let rankScore = 0
          let tags = []
          let priority = 'normal'

          if (isCompleted) {
              // Should we recommend a review?
              if (mastery > 0 && mastery < 0.6) {
                  rankScore = 80 // High priority
                  priority = 'high'
                  tags.push('Recommended Review')
              } else {
                  // Already completed and mastered well, don't show in To-Do list
                  continue 
              }
          } else {
              // Not completed. Is it the IMMEDIATE next sequential lesson?
              if (!nextUnseenLessonFound) {
                  rankScore = 100 // Highest priority - chronological next
                  priority = 'critical'
                  tags.push('Up Next')
                  nextUnseenLessonFound = true
              } else {
                  rankScore = 50 // Standard incomplete
                  priority = 'normal'
              }
          }

          tasks.push({
              subjectId: subject.id,
              subjectTitle: subject.title,
              lessonTitle: lessonTitle,
              mastery,
              rankScore,
              priority,
              tags,
              isQuizAvailable: !!lessonQuiz,
              isExam: false
          })
      }

      // 2b. Check for pending exams in this subject
      const subjectExams = exams?.filter(e => e.subject_id === subject.id) || []
      for (const exam of subjectExams) {
        const isExamCompleted = !!examAttempts?.some(a => a.exam_id === exam.id)
        if (!isExamCompleted) {
          tasks.push({
              subjectId: subject.id,
              subjectTitle: subject.title,
              lessonTitle: 'Final Personalized Exam',
              mastery: 0,
              rankScore: 150, // Top priority 
              priority: 'critical',
              tags: ['Exam Pending', 'Important'],
              isQuizAvailable: false,
              isExam: true
          })
        }
      }
    }
  }

  // 3. Subject momentum modifiers (Boost score if subject is almost done)
  tasks.forEach(task => {
      const subjectTasks = tasks.filter(t => t.subjectId === task.subjectId && t.priority !== 'high') // Exclude reviews from total count
      if (subjectTasks.length <= 2 && subjectTasks.length > 0) {
          task.rankScore += 10; // Momentum boost
          if (!task.tags.includes('Finish Line')) task.tags.push('Finish Line');
      }
  })

  // 4. Sort tasks
  tasks.sort((a, b) => b.rankScore - a.rankScore)

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight pt-2 flex items-center gap-3">
            <ListTodo className="h-8 w-8 text-emerald-500" />
            Adaptive To-Do List
        </h1>
        <p className="mt-2 text-muted-foreground">Your intelligently prioritized learning queue based on knowledge gaps and curriculum flow.</p>
        
        {styleProfile && styleProfile.predicted_style !== 'undetermined' && (
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center bg-zinc-950/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-cyan-400" />
                  <span className="text-sm font-semibold text-foreground">AI Study Tip: </span>
                  <span className="text-sm text-muted-foreground">We generated these tasks with your style in mind. Focus on</span>
              </div>
              <LearningStyleBadge style={styleProfile.predicted_style as any} confidence={Math.round(styleProfile.confidence)} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {tasks.length > 0 ? tasks.map((task, idx) => (
            <Card key={`${task.subjectId}-${task.lessonTitle}`} className={`bg-zinc-950/40 transition-all hover:bg-zinc-900/60
                ${task.priority === 'critical' ? 'border-emerald-500/30' : ''}
                ${task.priority === 'high' ? 'border-amber-500/30' : 'border-border/50'}
            `}>
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{task.subjectTitle}</span>
                            {task.tags.includes('Up Next') && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                                    <ArrowRight className="h-3 w-3" /> Up Next
                                </span>
                            )}
                            {task.tags.includes('Recommended Review') && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                                    <AlertTriangle className="h-3 w-3" /> Recommended Review
                                </span>
                            )}
                            {task.tags.includes('Finish Line') && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-500 border border-cyan-500/20">
                                    <TrendingUp className="h-3 w-3" /> Finish Line
                                </span>
                            )}
                            {task.tags.includes('Exam Pending') && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse">
                                    <AlertTriangle className="h-3 w-3" /> Exam Pending
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-foreground">{task.lessonTitle}</h3>
                        <p className="text-sm text-muted-foreground">
                            {task.isExam
                                ? `Unlock your certificate by completing the adaptive exam for ${task.subjectTitle}.`
                                : task.priority === 'high' 
                                ? `The deep learning model detected low mastery (${Math.round(task.mastery * 100)}%) in this concept.`
                                : `Continue your progress in ${task.subjectTitle}.`
                            }
                        </p>
                    </div>
                    
                    <div className="shrink-0 w-full md:w-auto flex items-center justify-between gap-6">
                        {task.mastery > 0 && (
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Mastery</span>
                                <span className={`text-sm font-bold ${task.mastery >= 0.8 ? 'text-emerald-500' : task.mastery >= 0.6 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {Math.round(task.mastery * 100)}%
                                </span>
                            </div>
                        )}
                        <Link href={`/student/subjects/${task.subjectId}`}>
                            <Button className={task.priority === 'critical' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/50' : ''}>
                                {task.isExam ? 'Take Exam' : task.priority === 'high' ? 'Review Lesson' : 'Start Lesson'}
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        )) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/50 bg-zinc-950/30 text-center p-8">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 opacity-80" />
                <h3 className="text-xl font-semibold">You're all caught up!</h3>
                <p className="text-muted-foreground max-w-sm">There are no pending lessons or recommended reviews. Keep exploring new subjects!</p>
                <Link href="/student">
                    <Button variant="outline" className="mt-4">Browse Subjects</Button>
                </Link>
            </div>
        )}
      </div>
    </div>
  )
}
