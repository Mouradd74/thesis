import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, BookOpen, LogOut, Layers, Activity, Target } from 'lucide-react'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role !== 'teacher') {
    redirect('/student')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border/50 bg-zinc-950/30 flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-80">
            <Layers className="h-5 w-5 text-foreground" />
            <span>EduPlatform</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="mb-6 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Teacher Portal</p>
            <nav className="flex flex-col gap-1">
              <Link href="/teacher" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-zinc-900/50 hover:text-foreground transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </Link>
              <Link href="/teacher/students" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-zinc-900/50 hover:text-foreground transition-colors">
                <Users className="h-4 w-4" />
                Students
              </Link>
              <Link href="/teacher/content" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-zinc-900/50 hover:text-foreground transition-colors">
                <BookOpen className="h-4 w-4" />
                Curriculum
              </Link>
              <Link href="/teacher/content/quiz-builder" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground pl-8 hover:bg-zinc-900/50 hover:text-foreground transition-colors">
                <Target className="h-4 w-4" />
                Quiz Builder
              </Link>
              <Link href="/teacher/analytics" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-zinc-900/50 hover:text-foreground transition-colors">
                <Activity className="h-4 w-4" />
                Analytics
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium border border-white/5">
              {profile?.full_name?.charAt(0) || 'T'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium leading-none truncate">{profile?.full_name}</span>
              <span className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">{user.email}</span>
            </div>
          </div>
          <form action={signOut}>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-zinc-900/50 h-9 px-2">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl py-10 px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
