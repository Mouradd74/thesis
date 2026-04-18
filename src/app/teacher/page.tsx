import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Users, Activity, Target, ArrowRight, Sparkles, Server, Zap } from 'lucide-react'
import Link from 'next/link'
import { checkMLHealth } from '@/lib/mlClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // 1. Get teacher's subjects first for strict filtering
  const { data: mySubjects, count: subjectsCount } = await supabase
    .from('subjects')
    .select('id, title', { count: 'exact' })
    .eq('teacher_id', user?.id || '')
    
  const subjectIds = mySubjects?.map((s) => s.id) || []

  // Default values for new teachers without subjects
  let studentsCount = 0
  let interactionsCount = 0
  let globalAvgMastery = 0
  let mlHealth = null

  if (subjectIds.length > 0) {
    // Parallel fetch for strictly scoped dashboard metrics
    const [
      enrollmentsRes,
      interactionsRes,
      masteryRes,
      healthRes
    ] = await Promise.all([
      supabase.from('enrollments').select('student_id', { count: 'exact', head: true }).in('subject_id', subjectIds),
      supabase.from('student_interactions').select('*', { count: 'exact', head: true }).in('subject_id', subjectIds),
      supabase.from('knowledge_states').select('p_mastery').in('subject_id', subjectIds),
      checkMLHealth()
    ])

    studentsCount = enrollmentsRes.count || 0
    interactionsCount = interactionsRes.count || 0
    mlHealth = healthRes

    const masteryData = masteryRes.data
    if (masteryData && masteryData.length > 0) {
      const sum = masteryData.reduce((acc, curr) => acc + curr.p_mastery, 0)
      globalAvgMastery = Math.round((sum / masteryData.length) * 100)
    }
  } else {
    mlHealth = await checkMLHealth()
  }

  const quickActions = [
    {
      title: 'Curriculum & CAT Builder',
      description: 'Manage lessons, upload videos, and calibrate IRT item banks.',
      icon: BookOpen,
      href: '/teacher/content',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Student Analytics',
      description: 'View K-Means clusters and LSTM deep knowledge tracing.',
      icon: Activity,
      href: '/teacher/analytics',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Student Roster',
      description: 'Manage individual profiles, learning styles, and ability scores.',
      icon: Users,
      href: '/teacher/students',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
  ]

  // --- Fetch Recent Activity ---
  // Teacher's subjects are already fetched at the top (`mySubjects`, `subjectIds`)

  // 2. Fetch recent quizzes for these subjects
  let quizAttempts = []
  if (subjectIds.length > 0) {
    const { data: quizzes } = await supabase.from('quizzes').select('id, lesson_title').in('subject_id', subjectIds)
    const quizIds = quizzes?.map(q => q.id) || []
    
    if (quizIds.length > 0) {
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .in('quiz_id', quizIds)
        .order('created_at', { ascending: false })
        .limit(10)
      
      quizAttempts = (attempts || []).map(a => ({
        type: 'quiz',
        studentId: a.student_id,
        score: a.score,
        date: a.created_at,
        title: quizzes?.find(q => q.id === a.quiz_id)?.lesson_title || 'Unknown Quiz'
      }))
    }
  }

  // 3. Fetch recent exams for these subjects
  let examAttempts = []
  if (subjectIds.length > 0) {
    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .in('subject_id', subjectIds)
      .order('created_at', { ascending: false })
      .limit(5)
      
    examAttempts = (exams || []).map(e => ({
      type: 'exam',
      studentId: e.student_id,
      score: null,
      date: e.created_at,
      title: mySubjects?.find(s => s.id === e.subject_id)?.title || 'Unknown Subject'
    }))
  }

  // Combine, sort, and map student names
  const allActivity = [...quizAttempts, ...examAttempts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  
  const studentIdsToFetch = Array.from(new Set(allActivity.map(a => a.studentId)))
  let studentMap: Record<string, string> = {}
  
  if (studentIdsToFetch.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', studentIdsToFetch)
    studentMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p.full_name || `User ${p.id.substring(0,4)}`
      return acc
    }, {} as Record<string, string>)
  }

  const activityFeed = allActivity.map(a => ({
    ...a,
    studentName: studentMap[a.studentId] || 'Anonymous Student'
  }))

  return (
    <div className="animate-fade-in flex flex-col gap-10 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Teacher Command Center</h1>
          <p className="mt-2 text-muted-foreground text-lg">Real-time oversight of your adaptive learning ecosystem.</p>
        </div>
        
        {/* ML Service Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
          mlHealth?.status === 'healthy' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <Server className="h-3.5 w-3.5" />
          ML Microservice: {mlHealth?.status === 'healthy' ? 'Online' : 'Offline'}
        </div>
      </header>
      
      {/* Primary Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-950/40 border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <BookOpen className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">My Subjects</CardDescription>
            <CardTitle className="text-3xl font-bold">{subjectsCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Active curriculum modules
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/40 border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Students</CardDescription>
            <CardTitle className="text-3xl font-bold">{studentsCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total unique enrollments</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/40 border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="h-12 w-12 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">System Engagements</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-500">{interactionsCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Individual platform interactions</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/40 border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Target className="h-12 w-12 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Global Mastery (BKT)</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-500">{globalAvgMastery}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-zinc-900 rounded-full h-1 mt-1 mb-2">
              <div className="bg-emerald-500 h-1 rounded-full transition-all duration-1000" style={{ width: `${globalAvgMastery}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Avg proficiency across all concepts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Quick Actions */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-1">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="bg-zinc-950/40 border-border/50 hover:bg-zinc-900 hover:-translate-y-1 transition-all cursor-pointer group">
                  <CardHeader className="flex flex-row items-center gap-4 py-4">
                    <div className={`p-3 rounded-2xl ${action.bgColor} ${action.color}`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mr-2 text-zinc-700" />
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Student Activity */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Recent Activity
          </h2>
          <Card className="bg-zinc-950/40 border-border/50 h-full overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Class Pulse</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="divide-y divide-white/5 flex-1 max-h-[400px] overflow-y-auto">
                {activityFeed.length > 0 ? (
                  activityFeed.map((activity, i) => (
                    <div key={i} className="p-4 hover:bg-zinc-900/50 transition-colors flex gap-3 items-start">
                      <div className="mt-0.5">
                        {activity.type === 'quiz' ? (
                          <div className={`p-1.5 rounded-full ${activity.score >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            <Target className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full bg-purple-500/10 text-purple-400">
                            <Zap className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {activity.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {activity.type === 'quiz' ? (
                            <>Scored <span className={activity.score >= 70 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{activity.score}%</span> on <span className="font-medium text-zinc-300">{activity.title}</span></>
                          ) : (
                            <>Started CAT Assessment for <span className="font-medium text-zinc-300">{activity.title}</span></>
                          )}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-70">
                    <Activity className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-foreground font-medium">No recent activity</p>
                    <p className="text-xs text-muted-foreground mt-1">Students haven't taken any quizzes or exams in your subjects yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

