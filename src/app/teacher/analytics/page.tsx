import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { clusterStudents } from '@/lib/mlClient'
import Link from 'next/link'
import { SubjectFilter } from './SubjectFilter'
import { Target, Users, BookOpen, Activity } from 'lucide-react'
import { MasteryHeatmap } from './MasteryHeatmap'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: subjects } = await supabase.from('subjects').select('id, title').eq('teacher_id', user.id)
  const subjectId = subject && subject !== 'all' ? subject : null

  // 1. Fetch data from Supabase
  const { data: students } = await supabase.from('profiles').select('id, full_name').eq('role', 'student')
  
  let interactionsQuery = supabase.from('student_interactions').select('*')
  let quizzesQuery = supabase.from('quiz_attempts').select('*, quizzes(subject_id)')
  let knowledgeQuery = supabase.from('knowledge_states').select('*')

  if (subjectId) {
    interactionsQuery = interactionsQuery.eq('subject_id', subjectId)
    knowledgeQuery = knowledgeQuery.eq('subject_id', subjectId)
    // For single subject, we'll filter quizzes locally after fetching since Supabase foreign table filtering can be tricky without !inner
  }

  const { data: interactions } = await interactionsQuery
  let { data: allQuizzes } = await quizzesQuery
  const { data: knowledgeStates } = await knowledgeQuery

  if (!students || !interactions || !allQuizzes) {
    return <div>Loading or No Data Available</div>
  }

  let quizzes = allQuizzes
  if (subjectId) {
    quizzes = allQuizzes.filter((q: any) => q.quizzes?.subject_id === subjectId)
  }

  // 2. Extract features per student
  const studentsFeatures: any[] = []
  let totalAnalyzed = 0
  let platformAvgScore = 0
  let totalInteractionsGlobal = 0
  let scoreSumGlobal = 0
  let scoreCountGlobal = 0
  
  for (const student of students) {
    const sInteractions = interactions.filter(i => i.student_id === student.id)
    const sQuizzes = quizzes.filter(q => q.student_id === student.id)
    
    const total_interactions = sInteractions.length
    if (total_interactions === 0 && sQuizzes.length === 0) continue

    totalAnalyzed++
    totalInteractionsGlobal += total_interactions

    const video_pct = total_interactions > 0 ? sInteractions.filter(i => i.content_type === 'video').length / total_interactions : 0
    const audio_pct = total_interactions > 0 ? sInteractions.filter(i => i.content_type === 'audio').length / total_interactions : 0
    const text_pct = total_interactions > 0 ? sInteractions.filter(i => i.content_type === 'text').length / total_interactions : 0
    const reopen_rate = total_interactions > 0 ? sInteractions.filter(i => i.event_type === 'content_reopen').length / total_interactions : 0

    let avg_quiz_score = 0
    let avg_hints_per_quiz = 0
    let quiz_pass_rate = 0

    if (sQuizzes.length > 0) {
      const qScoreSum = sQuizzes.reduce((acc, q) => acc + (q.score || 0), 0)
      avg_quiz_score = qScoreSum / sQuizzes.length
      quiz_pass_rate = sQuizzes.filter(q => (q.score || 0) >= 70).length / sQuizzes.length
      
      scoreSumGlobal += qScoreSum
      scoreCountGlobal += sQuizzes.length

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

  platformAvgScore = scoreCountGlobal > 0 ? scoreSumGlobal / scoreCountGlobal : 0

  // 3. Call ML Microservice to cluster
  let clusters: any[] = []
  if (studentsFeatures.length > 0) {
    const result = await clusterStudents(studentsFeatures)
    if (result && result.clusters) {
      // Calculate centroid stats for each cluster
      clusters = result.clusters.map((cluster: any) => {
        const clusterStudents = studentsFeatures.filter(f => cluster.students.includes(f.student_id))
        const count = clusterStudents.length
        return {
          ...cluster,
          centroid: count > 0 ? {
            avg_score: clusterStudents.reduce((acc, s) => acc + s.avg_quiz_score, 0) / count,
            pct_video: clusterStudents.reduce((acc, s) => acc + s.pct_video, 0) / count,
            pct_audio: clusterStudents.reduce((acc, s) => acc + s.pct_audio, 0) / count,
            pct_text: clusterStudents.reduce((acc, s) => acc + s.pct_text, 0) / count,
            reopen_rate: clusterStudents.reduce((acc, s) => acc + s.reopen_rate, 0) / count,
          } : null
        }
      })
    }
  }

  const studentMap: Record<string, string> = {}
  if (students) {
    students.forEach(s => studentMap[s.id] = s.full_name || `Student #${s.id.substring(0,8)}`)
  }

  // 4. Build Heatmap Data
  const heatmapMatrix: Record<string, Record<string, number>> = {}
  const conceptsSet = new Set<string>()
  const heatmapStudents: { id: string, name: string }[] = []

  if (knowledgeStates) {
    knowledgeStates.forEach(ks => {
      conceptsSet.add(ks.concept)
      if (!heatmapMatrix[ks.student_id]) {
        heatmapMatrix[ks.student_id] = {}
        if (!heatmapStudents.find(s => s.id === ks.student_id)) {
           heatmapStudents.push({ 
             id: ks.student_id, 
             name: studentMap[ks.student_id] || `User #${ks.student_id.substring(0,8)}` 
           })
        }
      }
      heatmapMatrix[ks.student_id][ks.concept] = ks.p_mastery
    })
  }

  const heatmapData = {
    students: heatmapStudents,
    concepts: Array.from(conceptsSet),
    matrix: heatmapMatrix
  }

  return (
    <div className="animate-fade-in flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Automatically discover student learning archetypes and behavioral segments using K-Means clustering.
        </p>
      </div>

      <SubjectFilter subjects={subjects || []} />

      {/* Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-950/40 border-border/50 text-center py-4">
          <p className="text-sm font-medium text-muted-foreground mb-1"><Users className="inline h-4 w-4 mr-2 text-blue-500" />Students Analyzed</p>
          <p className="text-3xl font-bold">{totalAnalyzed}</p>
        </Card>
        <Card className="bg-zinc-950/40 border-border/50 text-center py-4">
          <p className="text-sm font-medium text-muted-foreground mb-1"><Target className="inline h-4 w-4 mr-2 text-purple-500" />Clusters Identified</p>
          <p className="text-3xl font-bold">{clusters.filter(c => c.count > 0).length}</p>
        </Card>
        <Card className="bg-zinc-950/40 border-border/50 text-center py-4">
          <p className="text-sm font-medium text-muted-foreground mb-1"><Activity className="inline h-4 w-4 mr-2 text-emerald-500" />Avg Score</p>
          <p className="text-3xl font-bold">{Math.round(platformAvgScore)}%</p>
        </Card>
      </div>

      {clusters.length === 0 || totalAnalyzed === 0 ? (
        <Card className="bg-zinc-950/40 border-border/50 shadow-none">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Not enough data to segment students for the selected subject.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {clusters.map((cluster) => {
            if (cluster.count === 0) return null;
            return (
            <Card key={cluster.id} className="bg-zinc-950/40 border-border/50 shadow-none relative overflow-hidden flex flex-col">
              <div 
                className="absolute top-0 left-0 w-1 h-full" 
                style={{ backgroundColor: cluster.color }} 
              />
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center text-lg">
                  <span>{cluster.label}</span>
                  <span 
                    className="text-xs font-mono px-2 py-1 rounded-full bg-zinc-900 border border-white/10" 
                    style={{ color: cluster.color }}
                  >
                    {cluster.count} students
                  </span>
                </CardTitle>
                <CardDescription>
                  Group ID: {cluster.id}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col gap-4">
                {/* Centroid Stats */}
                {cluster.centroid && (
                  <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-zinc-900/40 rounded-xl border border-white/5">
                    <div>
                      <span className="text-muted-foreground text-xs uppercase font-semibold">Avg Score</span>
                      <p className="font-medium text-lg text-emerald-500">{Math.round(cluster.centroid.avg_score)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs uppercase font-semibold">Engagement</span>
                      <p className="font-medium">{Math.round(cluster.centroid.reopen_rate * 100)}% Reopen Rate</p>
                    </div>
                    <div className="col-span-2 mt-1">
                      <span className="text-muted-foreground text-xs uppercase font-semibold mb-1 block">Content Preference Split</span>
                      <div className="flex h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mt-1">
                        <div className="bg-blue-500 h-full" style={{ width: `${cluster.centroid.pct_video * 100}%` }} title={`Video: ${Math.round(cluster.centroid.pct_video * 100)}%`} />
                        <div className="bg-amber-500 h-full" style={{ width: `${cluster.centroid.pct_audio * 100}%` }} title={`Audio: ${Math.round(cluster.centroid.pct_audio * 100)}%`} />
                        <div className="bg-purple-500 h-full" style={{ width: `${cluster.centroid.pct_text * 100}%` }} title={`Text: ${Math.round(cluster.centroid.pct_text * 100)}%`} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span className="text-blue-400">Video {Math.round(cluster.centroid.pct_video * 100)}%</span>
                        <span className="text-amber-400">Audio {Math.round(cluster.centroid.pct_audio * 100)}%</span>
                        <span className="text-purple-400">Text {Math.round(cluster.centroid.pct_text * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-xs font-semibold mb-2 text-primary">Students in this cluster:</p>
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
                        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-zinc-950/80 border border-white/10 rounded-lg w-full min-w-[200px] animate-in fade-in slide-in-from-top-2 absolute z-10">
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
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {/* Heatmap Section */}
      <MasteryHeatmap data={heatmapData} />
    </div>
  )
}
