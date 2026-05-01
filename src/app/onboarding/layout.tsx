import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') {
    redirect('/teacher')
  }

  // If already completed onboarding, go to dashboard
  if (profile?.onboarding_completed) {
    redirect('/student')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
