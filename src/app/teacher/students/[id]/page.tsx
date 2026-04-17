import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LearningStyleBadge } from '@/components/ui/LearningStyleBadge'
import { ArrowLeft, User, Activity, Brain, Target, BookOpen, AlertTriangle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { QuizTimelineChart, EngagementRadarChart, SubjectComparisonChart } from './ProfileCharts'
import { ReportButton } from './ReportButton'

export const dynamic = 'force-dynamic'

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await params;
  const supabase = await createClient()

  // Verify the requesting user is a teacher
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teacherProfile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  if (teacherProfile?.role !== 'teacher') return notFound()

  // Fetch 360-degree student data
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', studentId).single()
  if (!profile) return notFound()

  const { data: enrollments } = await supabase.from('enrollments').select('*, subjects(id, title)').eq('student_id', studentId)
  const { data: styleProfiles } = await supabase.from('learning_style_profiles').select('*').eq('student_id', studentId)
  const { data: knowledgeStates } = await supabase.from('knowledge_states').select('*').eq('student_id', studentId)
  const { data: abilities } = await supabase.from('student_abilities').select('*').eq('student_id', studentId)
  const { data: quizAttemptsData } = await supabase.from('quiz_attempts').select('*, quizzes(subject_id, lesson_title)').eq('student_id', studentId).order('created_at', { ascending: true })
  const { data: interactionsData } = await supabase.from('student_interactions').select('*').eq('student_id', studentId)

  const quizAttempts = quizAttemptsData || []
  const interactions = interactionsData || []

  // Find dominant learning style across all subjects
  let dominantStyle = null
  let maxConfidence = 0
  if (styleProfiles && styleProfiles.length > 0) {
    dominantStyle = styleProfiles.reduce((prev, current) => (prev.confidence > current.confidence) ? prev : current)
    maxConfidence = Math.round(dominantStyle.confidence)
  }

  // Aggregate basic global metrics
  let globalAvgScore = 0
  let totalHints = 0
  if (quizAttempts.length > 0) {
    globalAvgScore = quizAttempts.reduce((acc, q) => acc + (q.score || 0), 0) / quizAttempts.length
    quizAttempts.forEach(q => {
      if (Array.isArray(q.hints_used)) {
        totalHints += q.hints_used.filter(Boolean).length
      }
    })
  }

  let globalMasteryAvg = 0
  if (knowledgeStates && knowledgeStates.length > 0) {
    globalMasteryAvg = knowledgeStates.reduce((acc, k) => acc + k.p_mastery, 0) / knowledgeStates.length
  }

  const enrolledSubjects = enrollments?.map(e => e.subjects) || []

  // Pre-compute Subject Comparison Data
  const comparisonData = enrolledSubjects.map((sub: any) => {
    const sQuizzes = quizAttempts.filter(q => (q.quizzes as any)?.subject_id === sub.id)
    const subScore = sQuizzes.length > 0 ? sQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / sQuizzes.length : 0
    
    const sKS = (knowledgeStates || []).filter(k => k.subject_id === sub.id)
    const subMastery = sKS.length > 0 ? (sKS.reduce((acc, k) => acc + k.p_mastery, 0) / sKS.length) * 100 : 0
    
    const subTheta = (abilities || []).find(a => a.subject_id === sub.id)?.ability_theta || 0

    return {
      subject: sub.title,
      score: subScore,
      mastery: subMastery,
      theta: subTheta
    }
  })

  // Global At-Risk check
  const isGloballyAtRisk = (globalAvgScore < 50 && quizAttempts.length > 2) || (globalMasteryAvg < 0.4 && (knowledgeStates || []).length > 2)

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/teacher/students" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Students
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{profile.full_name || 'Profile'}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center border shrink-0 ${isGloballyAtRisk ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-zinc-900 border-white/10 text-zinc-400'}`}>
              {isGloballyAtRisk ? <AlertTriangle className="h-8 w-8" /> : <User className="h-8 w-8" />}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                {profile.full_name || `Student #${studentId.substring(0,8)}`}
                {isGloballyAtRisk && <span className="text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">At Risk</span>}
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-1">{studentId}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:items-end w-full md:w-auto">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-end w-full">
              {dominantStyle && (
                <div className="flex flex-col gap-2 md:items-end order-2 md:order-1">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Dominant Learning Style</span>
                  <LearningStyleBadge style={dominantStyle.predicted_style as any} confidence={maxConfidence} />
                </div>
              )}
              <div className="order-1 md:order-2 w-full md:w-auto">
                <ReportButton studentId={studentId} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/40 border-border/50 text-center py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1"><BookOpen className="inline h-3 w-3 mr-1" />Subjects</p>
          <p className="text-2xl font-bold">{enrolledSubjects.length}</p>
        </Card>
        <Card className="bg-zinc-950/40 border-border/50 text-center py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1"><Activity className="inline h-3 w-3 mr-1" />Quizzes</p>
          <p className="text-2xl font-bold">{quizAttempts.length}</p>
        </Card>
        <Card className="bg-zinc-950/40 border-border/50 text-center py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Avg Score</p>
          <p className={`text-2xl font-bold ${globalAvgScore < 50 ? 'text-red-500' : 'text-emerald-500'}`}>{Math.round(globalAvgScore)}%</p>
        </Card>
        <Card className="bg-zinc-950/40 border-border/50 text-center py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1"><Target className="inline h-3 w-3 mr-1" />Avg Mastery</p>
          <p className={`text-2xl font-bold ${globalMasteryAvg < 0.4 ? 'text-red-500' : 'text-amber-500'}`}>{Math.round(globalMasteryAvg * 100)}%</p>
        </Card>
      </div>

      {/* Cross-Subject Comparison Chart */}
      {enrolledSubjects.length > 0 && (
        <Card className="bg-zinc-950/40 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Subject Performance Comparison</CardTitle>
            <CardDescription>Comparing average scores, conceptual mastery, and cognitive ability (IRT) across all enrolled subjects.</CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectComparisonChart data={comparisonData} />
          </CardContent>
        </Card>
      )}

      {/* Per-Subject Breakdowns */}
      <div className="flex flex-col gap-8 mt-4">
        <h2 className="text-xl font-semibold tracking-tight border-b border-border/50 pb-2">Per-Subject Analysis</h2>
        
        {enrolledSubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-zinc-950/40 p-6 rounded-xl border border-dashed border-border/50 text-center">
            Student is not currently enrolled in any subjects.
          </p>
        ) : (
          enrolledSubjects.map((sub: any) => {
            // Filter data for this subject
            const sQuizzes = quizAttempts.filter(q => (q.quizzes as any)?.subject_id === sub.id)
            const timelineData = sQuizzes.map((q, i) => ({
              name: (q.quizzes as any)?.lesson_title || `Quiz ${i+1}`,
              score: q.score || 0
            }))

            const sInteractions = interactions.filter(i => i.subject_id === sub.id && i.content_type)
            const totalInteractionContent = sInteractions.length || 1 // prevent div by zero
            const videoPct = sInteractions.filter(i => i.content_type === 'video').length / totalInteractionContent
            const audioPct = sInteractions.filter(i => i.content_type === 'audio').length / totalInteractionContent
            const textPct = sInteractions.filter(i => i.content_type === 'text').length / totalInteractionContent

            const sKS = (knowledgeStates || []).filter(k => k.subject_id === sub.id)
            const subAbility = (abilities || []).find(a => a.subject_id === sub.id)
            const subStyle = (styleProfiles || []).find(s => s.subject_id === sub.id)

            const thisSubScore = sQuizzes.length > 0 ? sQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / sQuizzes.length : 0
            const isSubAtRisk = thisSubScore < 50 && sQuizzes.length > 0

            return (
              <div key={sub.id} className="flex flex-col gap-4 bg-zinc-950/20 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                {isSubAtRisk && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{sub.title}</h3>
                    {isSubAtRisk && <p className="text-xs font-semibold text-red-500 mt-1">Requires Attention: Consistently low quiz scores.</p>}
                  </div>
                  {subStyle && (
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1">Subject Style</span>
                      <LearningStyleBadge style={subStyle.predicted_style as any} confidence={subStyle.confidence} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  
                  {/* Left Column: Timeline & Ability */}
                  <div className="flex flex-col gap-6">
                    <Card className="bg-zinc-950/60 border-white/5 shadow-none">
                      <CardHeader className="py-3 px-4 border-b border-white/5">
                        <CardTitle className="text-sm font-medium">Quiz Performance History</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <QuizTimelineChart data={timelineData} />
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-950/60 border-white/5 shadow-none">
                      <CardHeader className="py-3 px-4 border-b border-white/5">
                        <CardTitle className="text-sm font-medium flex gap-2"><Brain className="h-4 w-4 text-purple-500" /> Cognitive Ability (IRT)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {subAbility ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm mb-1">
                              <span className="font-semibold text-muted-foreground">Θ (Theta) Score</span>
                              <span className="font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">{subAbility.ability_theta.toFixed(2)}</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, ((subAbility.ability_theta + 3) / 6) * 100))}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Estimated from -3.0 (Novice) to 3.0 (Expert).</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not enough data to estimate ability.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Mastery & Engagement */}
                  <div className="flex flex-col gap-6">
                    <Card className="bg-zinc-950/60 border-white/5 shadow-none flex-1">
                      <CardHeader className="py-3 px-4 border-b border-white/5">
                        <CardTitle className="text-sm font-medium flex gap-2"><Target className="h-4 w-4 text-amber-500" /> Topic Mastery (BKT)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {sKS && sKS.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {sKS.map(k => (
                              <div key={k.id} className="flex items-center gap-3">
                                 <span className="text-xs font-mono text-muted-foreground truncate w-24" title={k.concept}>{k.concept}</span>
                                 <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                                   <div 
                                     className={`h-full rounded-full ${k.p_mastery > 0.8 ? 'bg-emerald-500' : k.p_mastery > 0.5 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                     style={{ width: `${k.p_mastery * 100}%` }} 
                                   />
                                 </div>
                                 <span className="text-xs font-semibold w-8 text-right">{Math.round(k.p_mastery * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No concepts traced yet.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-950/60 border-white/5 shadow-none pb-2">
                      <CardHeader className="py-3 px-4 border-b border-white/5">
                        <CardTitle className="text-sm font-medium">Content Engagement</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {sInteractions.length > 0 ? (
                          <EngagementRadarChart video={videoPct} audio={audioPct} text={textPct} />
                        ) : (
                          <div className="p-4"><p className="text-xs text-muted-foreground">No interactions recorded.</p></div>
                        )}
                      </CardContent>
                    </Card>

                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
