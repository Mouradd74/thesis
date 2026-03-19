import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TeacherDashboard() {
  const supabase = await createClient()
  
  const { count: studentsCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true })
  const { count: subjectsCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true })

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-2 text-muted-foreground">Welcome back. Here's a summary of your active metrics.</p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-zinc-950/40 border-border/50 shadow-none pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{subjectsCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/40 border-border/50 shadow-none pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{studentsCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/40 border-border/50 shadow-none pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Attendance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-500">94%</div>
            <p className="text-xs text-muted-foreground mt-1">+2% from last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
