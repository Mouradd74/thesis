import { createClient } from '@/utils/supabase/server'
import { Sparkles } from 'lucide-react'
import { getLearningStyleProfile } from '@/app/student/learning-style/actions'
import { predictLearningStyle } from '@/lib/mlClient'
import { LearningStyleBadge } from '@/components/ui/LearningStyleBadge'

export async function WelcomeBannerSuspense() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Run profiling queries in parallel
  const [profile, interactionsResult, masteryDataResult] = await Promise.all([
    getLearningStyleProfile(user.id),
    supabase
      .from('student_interactions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('knowledge_states')
      .select('p_mastery')
      .eq('student_id', user.id)
  ])

  const interactions = interactionsResult.data

  let mlStyleProfile = null
  if (interactions && interactions.length > 0) {
    mlStyleProfile = await predictLearningStyle(user.id, interactions)
  }

  const masteryData = masteryDataResult.data
  let avgMastery = 0;
  if (masteryData && masteryData.length > 0) {
    const sum = masteryData.reduce((acc: number, curr: any) => acc + curr.p_mastery, 0);
    avgMastery = Math.round((sum / masteryData.length) * 100);
  }

  if (!profile || profile.predicted_style === 'undetermined') {
    return null
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20 flex flex-col xl:flex-row xl:items-center justify-between gap-4 animate-in fade-in duration-500">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          Adaptive Learning Engine Model outputs (For Debugging purposes)
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Based on {profile.interaction_count} interactions across all your subjects, we've detected your optimal learning style.</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">


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
  )
}
