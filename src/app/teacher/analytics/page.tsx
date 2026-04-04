import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { clusterStudents } from '@/lib/mlClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // 1. Fetch data from Supabase
  const { data: students } = await supabase.from('profiles').select('id, full_name').eq('role', 'student')
  const { data: interactions } = await supabase.from('student_interactions').select('*')
  const { data: quizzes } = await supabase.from('quiz_attempts').select('*')

  if (!students || !interactions || !quizzes) {
    return <div>Loading or No Data Available</div>
  }

  // 2. Extract features per student
  const studentsFeatures: any[] = []
  
  for (const student of students) {
    const sInteractions = interactions.filter(i => i.student_id === student.id)
    const sQuizzes = quizzes.filter(q => q.student_id === student.id)
    
    const total_interactions = sInteractions.length
    if (total_interactions === 0) continue

    const video_pct = sInteractions.filter(i => i.content_type === 'video').length / total_interactions
    const audio_pct = sInteractions.filter(i => i.content_type === 'audio').length / total_interactions
    const text_pct = sInteractions.filter(i => i.content_type === 'text').length / total_interactions
    
    const reopen_rate = sInteractions.filter(i => i.event_type === 'content_reopen').length / total_interactions

    let avg_quiz_score = 0
    let avg_hints_per_quiz = 0
    let quiz_pass_rate = 0

    if (sQuizzes.length > 0) {
      avg_quiz_score = sQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / sQuizzes.length
      quiz_pass_rate = sQuizzes.filter(q => (q.score || 0) >= 70).length / sQuizzes.length
      
      let total_hints = 0
      for (const q of sQuizzes) {
        if (Array.isArray(q.hints_used)) {
          total_hints += q.hints_used.filter(Boolean).length
        }
      }
      avg_hints_per_quiz = total_hints / sQuizzes.length
    }

    studentsFeatures.push({
      student_id: student.id,
      pct_video: video_pct,
      pct_audio: audio_pct,
      pct_text: text_pct,
      avg_quiz_score,
      avg_hints_per_quiz,
      total_interactions,
      reopen_rate,
      quiz_pass_rate
    })
  }

  // 3. Call ML Microservice to cluster
  let clusters: any[] = []
  if (studentsFeatures.length > 0) {
    const result = await clusterStudents(studentsFeatures)
    if (result && result.clusters) {
      clusters = result.clusters
    }
  }

  const studentMap: Record<string, string> = {}
  if (students) {
    students.forEach(s => studentMap[s.id] = s.full_name || `Student #${s.id.substring(0,8)}`)
  }

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Automatically discover student learning archetypes using K-Means clustering.
        </p>
      </div>

      {clusters.length === 0 ? (
        <Card className="bg-zinc-950/40 border-border/50 shadow-none">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Not enough data or ML models are currently training. Make sure you run the training script.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="bg-zinc-950/40 border-border/50 shadow-none relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-1 h-full" 
                style={{ backgroundColor: cluster.color }} 
              />
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{cluster.label}</span>
                  <span 
                    className="text-xs font-mono px-2 py-1 rounded-full bg-zinc-900" 
                    style={{ color: cluster.color }}
                  >
                    {cluster.count} students
                  </span>
                </CardTitle>
                <CardDescription>
                  Group ID: {cluster.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Students in this cluster dynamically adapt based on behavioral features like content preference and interaction rates.</p>
                  <div className="pt-4 border-t border-border/20 mt-4">
                    <p className="text-xs font-semibold mb-2 text-primary">Students:</p>
                    <div className="flex flex-wrap gap-2 items-start">
                      {cluster.students.slice(0, 5).map((id: string) => (
                        <Link href={`/teacher/students/${id}`} key={id}>
                          <span className="inline-flex text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 hover:text-foreground transition-colors px-2.5 py-1 rounded-md text-zinc-300 cursor-pointer border border-white/5">
                            {studentMap[id] || `User ${id.substring(0,4)}`}
                          </span>
                        </Link>
                      ))}
                      {cluster.students.length > 5 && (
                        <details className="group relative list-none [&::-webkit-details-marker]:hidden">
                          <summary className="inline-flex text-[11px] bg-zinc-900/50 hover:bg-zinc-800 px-2.5 py-1 rounded-md text-zinc-400 border border-transparent cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50">
                            +{cluster.students.length - 5} more
                          </summary>
                          <div className="flex flex-wrap gap-2 mt-2 p-3 bg-zinc-950/80 border border-white/10 rounded-lg w-full min-w-[200px] animate-in fade-in slide-in-from-top-2">
                            {cluster.students.slice(5).map((id: string) => (
                              <Link href={`/teacher/students/${id}`} key={id}>
                                <span className="inline-flex text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 hover:text-foreground transition-colors px-2.5 py-1 rounded-md text-zinc-300 cursor-pointer border border-white/5">
                                  {studentMap[id] || `User ${id.substring(0,4)}`}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
