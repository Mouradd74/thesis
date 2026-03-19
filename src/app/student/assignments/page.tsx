import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`subjects ( title )`)
    .eq('student_id', user?.id)

  const subjectTitles = enrollments?.map((e: any) => e.subjects?.title) || []

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Assignments & Quizzes</h1>
        <p className="mt-2 text-muted-foreground">Test your knowledge on the adaptive materials you've studied.</p>
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-semibold tracking-tight mb-6">Pending Checks</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {subjectTitles.length > 0 ? subjectTitles.map((title, i) => (
            <Card key={title} className="bg-zinc-950/40 border-border/50 transition-all hover:bg-zinc-900/60 hover:shadow-lg flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                    To Do
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Due: Friday</span>
                </div>
                <CardTitle className="text-lg">{title} Checkpoint</CardTitle>
                <CardDescription className="mt-1">Complete the adaptive quiz corresponding to the newly uploaded materials for {title}.</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-2">
                <Button className="w-full">Start Quiz</Button>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-full flex h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">You have no pending assignments or quizzes!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
