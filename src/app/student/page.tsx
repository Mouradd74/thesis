import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      motivation_score,
      attendance_rate,
      subjects ( id, title, description )
    `)
    .eq('student_id', user?.id)

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Learning Hub</h1>
        <p className="mt-2 text-muted-foreground">Pick up where you left off and explore your adaptive courses.</p>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Enrolled Subjects</h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          {enrollments?.map((e: any) => (
            <Link key={e.subjects.id} href={`/student/subjects/${e.subjects.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl">
              <Card className="bg-zinc-950/40 border-border/50 transition-all hover:bg-zinc-900/60 hover:shadow-lg hover:-translate-y-1 h-full cursor-pointer flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">{e.subjects.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">{e.subjects.description || 'No description provided.'}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-6">
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 rounded-xl bg-zinc-900/80 p-3 border border-white/5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-center mb-1">Attendance</span>
                      <strong className="block text-center text-lg text-emerald-500">{e.attendance_rate}%</strong>
                    </div>
                    <div className="flex-1 rounded-xl bg-zinc-900/80 p-3 border border-white/5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-center mb-1">Motivation</span>
                      <strong className="block text-center text-lg text-amber-500">{e.motivation_score}/10</strong>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-end text-sm font-medium text-accent-foreground group-hover:text-foreground">
                    Continue learning <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!enrollments || enrollments.length === 0) && (
             <div className="col-span-full flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
               <p className="text-sm text-muted-foreground">You are not currently enrolled in any subjects. Ask your teacher to add you.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
