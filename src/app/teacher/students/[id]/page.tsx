import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LearningStyleBadge } from '@/components/ui/LearningStyleBadge'
import { ArrowLeft, User, Activity, Brain, Target, BookOpen, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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

  const { data: enrollments } = await supabase.from('enrollments').select('*, subjects(title)').eq('student_id', studentId)
  const { data: styleProfiles } = await supabase.from('learning_style_profiles').select('*, subjects(title)').eq('student_id', studentId)
  const { data: knowledgeStates } = await supabase.from('knowledge_states').select('*, subjects(title)').eq('student_id', studentId)
  const { data: abilities } = await supabase.from('student_abilities').select('*, subjects(title)').eq('student_id', studentId)
  const { data: quizAttempts } = await supabase.from('quiz_attempts').select('score, hints_used').eq('student_id', studentId)

  // Aggregate basic metrics
  let avgScore = 0
  let totalHints = 0
  if (quizAttempts && quizAttempts.length > 0) {
    avgScore = quizAttempts.reduce((acc, q) => acc + (q.score || 0), 0) / quizAttempts.length
    
    quizAttempts.forEach(q => {
      if (Array.isArray(q.hints_used)) {
        totalHints += q.hints_used.filter(Boolean).length
      }
    })
  }

  // Find dominant learning style across all subjects
  let dominantStyle = null
  let maxConfidence = 0
  if (styleProfiles && styleProfiles.length > 0) {
    dominantStyle = styleProfiles.reduce((prev, current) => (prev.confidence > current.confidence) ? prev : current)
    maxConfidence = Math.round(dominantStyle.confidence)
  }

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <Link href="/teacher/analytics" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Analytics
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10 shrink-0">
              <User className="h-8 w-8 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {profile.full_name || `Student #${studentId.substring(0,8)}`}
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-1">{studentId}</p>
            </div>
          </div>
          
          {dominantStyle && (
            <div className="flex flex-col gap-2 md:items-end">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Dominant Learning Style</span>
              <LearningStyleBadge style={dominantStyle.predicted_style} confidence={maxConfidence} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Basic Stats Column */}
        <div className="flex flex-col gap-6 md:col-span-1">
          <Card className="bg-zinc-950/40 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" /> Activity Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Quizzes Taken</p>
                 <p className="text-2xl font-bold">{quizAttempts?.length || 0}</p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Average Quiz Score</p>
                 <p className="text-2xl font-bold">{Math.round(avgScore)}%</p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Hints Requested</p>
                 <p className="text-2xl font-bold">{totalHints}</p>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/40 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" /> Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
               {enrollments && enrollments.length > 0 ? enrollments.map(e => (
                 <div key={e.id} className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                   <p className="font-medium text-sm">{e.subjects?.title || 'Unknown Subject'}</p>
                   <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                     <span>Motiv: {e.motivation_score}/10</span>
                     <span>Attend: {e.attendance_rate}%</span>
                   </div>
                 </div>
               )) : (
                 <p className="text-sm text-muted-foreground">No active enrollments.</p>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Cognitive & Mastery Column */}
        <div className="flex flex-col gap-6 md:col-span-2">
          
          {/* IRT Abilities */}
          <Card className="bg-zinc-950/40 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" /> Cognitive Abilities (IRT Theta)
              </CardTitle>
              <CardDescription>Estimated inherent capability scaling from -3.0 (Novice) to 3.0 (Expert).</CardDescription>
            </CardHeader>
            <CardContent>
              {abilities && abilities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {abilities.map(a => {
                    const percent = Math.max(0, Math.min(100, ((a.ability_theta + 3) / 6) * 100))
                    return (
                      <div key={a.id} className="flex flex-col gap-2 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold">{a.subjects?.title}</span>
                          <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                            Θ: {a.ability_theta.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not enough data to estimate abilities yet.</p>
              )}
            </CardContent>
          </Card>

          {/* BKT Mastery States */}
          <Card className="bg-zinc-950/40 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" /> Granular Mastery (BKT)
              </CardTitle>
              <CardDescription>Live probability that the student has mastered specific granular concepts.</CardDescription>
            </CardHeader>
            <CardContent>
              {knowledgeStates && knowledgeStates.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {knowledgeStates.map(k => (
                    <div key={k.id} className="flex items-center gap-4">
                       <span className="text-xs font-mono text-muted-foreground w-12 text-right">{k.concept}</span>
                       <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full ${k.p_mastery > 0.8 ? 'bg-emerald-500' : k.p_mastery > 0.5 ? 'bg-amber-500' : 'bg-red-500'}`} 
                           style={{ width: `${k.p_mastery * 100}%` }} 
                         />
                       </div>
                       <span className="text-xs font-semibold w-10 text-right">{Math.round(k.p_mastery * 100)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No concepts traced yet. Student must complete quizzes.</p>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  )
}
