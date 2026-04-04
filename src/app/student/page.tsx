import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, Sparkles } from 'lucide-react'
import { getLearningStyleProfile } from '@/app/student/learning-style/actions'
import { predictLearningStyle } from '@/lib/mlClient'
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

  // Fetch all interactions for the ML model
  let mlStyleProfile = null
  if (user) {
    const { data: interactions } = await supabase
      .from('student_interactions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: true })

    if (interactions && interactions.length > 0) {
      mlStyleProfile = await predictLearningStyle(user.id, interactions)
    }
  }

  // Fetch BKT Mastery Data
  const { data: masteryData } = await supabase
    .from('knowledge_states')
    .select('p_mastery')
    .eq('student_id', user?.id || '')

  let avgMastery = 0;
  if (masteryData && masteryData.length > 0) {
    const sum = masteryData.reduce((acc: number, curr: any) => acc + curr.p_mastery, 0);
    avgMastery = Math.round((sum / masteryData.length) * 100);
  }

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Learning Hub</h1>
        <p className="mt-2 text-muted-foreground">Pick up where you left off and explore every adaptive module globally available.</p>

        {profile && profile.predicted_style !== 'undetermined' && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Adaptive Learning Engine Model outputs(For Debugging purposes)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Based on {profile.interaction_count} interactions across all your subjects, we've detected your optimal learning style.</p>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="shrink-0 flex items-center gap-3 bg-zinc-950/50 p-2 rounded-xl border border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Heuristic Profiler</span>
                <LearningStyleBadge style={profile.predicted_style as any} confidence={profile.confidence} />
              </div>

              {mlStyleProfile && mlStyleProfile.predicted_style !== 'undetermined' && (
                <div className="shrink-0 flex items-center gap-3 bg-zinc-950/50 p-2 rounded-xl border border-emerald-500/30">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">ML Neural Profiler</span>
                  <LearningStyleBadge style={mlStyleProfile.predicted_style as any} confidence={Math.round(mlStyleProfile.confidence)} />
                </div>
              )}

              {avgMastery > 0 && (
                <div className="shrink-0 flex items-center gap-3 bg-zinc-950/50 p-2 rounded-xl border border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Mastery (BKT)</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${avgMastery >= 80 ? 'bg-emerald-500/20 text-emerald-500' : avgMastery >= 50 ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>{avgMastery}%</span>
                </div>
              )}
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
