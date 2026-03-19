import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, Layers, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center selection:bg-primary/20">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px]"></div>
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Layers className="h-5 w-5 text-foreground" />
            <span>EduPlatform</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button size="sm" asChild className="rounded-full">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-32 text-center sm:py-40">
        <div className="inline-flex items-center rounded-full border border-border/50 bg-white/5 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm mb-8 animate-fade-in opacity-0" style={{ animationDelay: '100ms' }}>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
          Now welcoming new beta students
        </div>
        
        <h1 className="text-5xl font-bold tracking-tighter text-foreground sm:text-7xl animate-fade-in opacity-0 leading-[1.1]" style={{ animationDelay: '200ms' }}>
          Adaptive learning <br />
          <span className="text-muted-foreground">reimagined.</span>
        </h1>
        
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed animate-fade-in opacity-0" style={{ animationDelay: '300ms' }}>
          Deliver personalized educational journeys. Monitor engagement metrics. 
          Unleash the ultimate SaaS platform designed exclusively for modern educators and students.
        </p>
        
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center animate-fade-in opacity-0" style={{ animationDelay: '400ms' }}>
          <Button size="lg" className="rounded-full px-8 h-12" asChild>
            <Link href="/signup">
              Start Building Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-8 h-12 bg-transparent hover:bg-white/5" asChild>
            <Link href="/login">
              Teacher Login
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32 border-t border-border/40 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4 p-8 rounded-3xl border border-border/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900 border border-border/50">
              <BookOpen className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Adaptive Curriculum</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Instantly toggle between video, audio, and text abstractions based on personal learning velocities.</p>
          </div>
          <div className="flex flex-col gap-4 p-8 rounded-3xl border border-border/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900 border border-border/50">
              <Zap className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Live Metrics Tracker</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Monitor class attendance and subjective motivation scores from the teacher portal seamlessly.</p>
          </div>
          <div className="flex flex-col gap-4 p-8 rounded-3xl border border-border/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900 border border-border/50">
              <Layers className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Role Based Engine</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Fully secured via edge middleware enforcing strict boundaries between faculty and student data.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
