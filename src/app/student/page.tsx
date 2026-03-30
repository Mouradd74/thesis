import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, Sparkles } from 'lucide-react'
import { getLearningStyleProfile } from '@/app/student/learning-style/actions'
import { LearningStyleBadge } from '@/components/ui/LearningStyleBadge'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentDashboard() {
  const supabase = await createClient()

  // Auto-enrolling: Show all available subjects directly dynamically.
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()
  const profile = user ? await getLearningStyleProfile(user.id) : null

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Learning Hub</h1>
        <p className="mt-2 text-muted-foreground">Pick up where you left off and explore every adaptive module globally available.</p>
        
        {profile && profile.predicted_style !== 'undetermined' && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Adaptive Learning Engine
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Based on {profile.interaction_count} interactions across all your subjects, we've detected your optimal learning style.</p>
            </div>
            <div className="shrink-0 flex items-center gap-3 bg-zinc-950/50 p-2 rounded-xl border border-white/5">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Profile</span>
               <LearningStyleBadge style={profile.predicted_style as any} confidence={profile.confidence} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight">System Courses</h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          {subjects?.map((subject: any) => (
            <Link key={subject.id} href={`/student/subjects/${subject.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl">
              <Card className="bg-zinc-950/40 border-border/50 transition-all hover:bg-zinc-900/60 hover:shadow-lg hover:-translate-y-1 h-full cursor-pointer flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">{subject.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">{subject.description || 'No description provided.'}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-6">
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 rounded-xl bg-zinc-900/80 p-3 border border-white/5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-center mb-1">Status</span>
                      <strong className="block text-center text-sm text-emerald-500">Available</strong>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-end text-sm font-medium text-accent-foreground group-hover:text-foreground">
                    Start learning <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!subjects || subjects.length === 0) && (
             <div className="col-span-full flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
               <p className="text-sm text-muted-foreground">No subjects have been published for you yet.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
