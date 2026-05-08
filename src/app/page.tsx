'use client'

import { useTyping } from '@/hooks/useTyping'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, Layers, Zap, Play } from 'lucide-react'

export default function Home() {
  const line1 = useTyping("Adaptive learning", 60, 200)
  const line2 = useTyping("reimagined.", 60, 1800)

  return (
    <main className="flex min-h-screen flex-col items-center selection:bg-primary/20">

      {/* Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px]" />

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

        {/* Badge */}
        <div className="inline-flex items-center rounded-full border border-border/50 bg-white/5 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm mb-8 animate-fade-in opacity-0"
          style={{ animationDelay: '100ms' }}>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
          Live Now !
        </div>

        {/* Premium Typing Heading */}
        <h1 className="text-5xl font-bold tracking-tighter text-foreground sm:text-7xl leading-[1.1]">

          {/* Line 1 (NO cursor) */}
          <span>
            {line1}
          </span>

          <br />

          {/* Line 2 (WITH cursor) */}
          <span className="text-muted-foreground">
            {line2}
            <span className="cursor" />
          </span>

        </h1>

        {/* Subtext */}
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed animate-fade-in opacity-0"
          style={{ animationDelay: '300ms' }}>
          Personalized learning built around you.
          Learn at your own pace with content that adapts to your strengths.
          Achieve more with a smarter, tailored learning experience.
        </p>

        {/* Buttons */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center animate-fade-in opacity-0"
          style={{ animationDelay: '400ms' }}>

          <Button size="lg" className="rounded-full px-8 h-12" asChild>
            <Link href="/signup">
              Start Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Button size="lg" variant="outline" className="rounded-full px-8 h-12 bg-transparent hover:bg-white/5" asChild>
            <Link href="/login">
              Teacher Login
            </Link>
          </Button>

          <Button size="lg" variant="ghost" className="rounded-full px-8 h-12 hover:bg-white/5" asChild>
            <a href="#onboarding">
              <Play className="mr-2 h-4 w-4 fill-emerald-500/20 text-emerald-500" />
              Watch Onboarding
            </a>
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
            <p className="text-muted-foreground text-sm leading-relaxed">
              Instantly toggle between video, audio, and text abstractions based on personal learning velocities.
            </p>
          </div>

          <div className="flex flex-col gap-4 p-8 rounded-3xl border border-border/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900 border border-border/50">
              <Zap className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Live Metrics Tracker</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monitor class attendance and subjective motivation scores from the teacher portal seamlessly.
            </p>
          </div>

          <div className="flex flex-col gap-4 p-8 rounded-3xl border border-border/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900 border border-border/50">
              <Layers className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Role Based Engine</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Fully secured via edge middleware enforcing strict boundaries between faculty and student data.
            </p>
          </div>

        </div>
      </section>

      {/* Onboarding Videos Section */}
      <section id="onboarding" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 border-t border-border/40 w-full scroll-mt-20">
        <div className="flex flex-col items-center justify-center mb-16 text-center animate-fade-in opacity-0" style={{ animationDelay: '200ms' }}>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground">Getting Started</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Watch our quick onboarding guides to get the most out of your adaptive learning experience.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 animate-fade-in opacity-0" style={{ animationDelay: '400ms' }}>
          {/* Teacher Onboarding */}
          <div className="flex flex-col gap-6 p-6 rounded-3xl border border-border/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-emerald-500/5">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">Teacher Onboarding</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Learn how to manage students, track progress, and customize curriculum delivery in the teacher portal.
              </p>
            </div>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border/50 bg-zinc-900 shadow-inner">
              <iframe 
                src="https://www.youtube.com/embed/-2WoCYE7bZk" 
                title="Teacher Onboarding Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
              ></iframe>
            </div>
          </div>

          {/* Student Onboarding */}
          <div className="flex flex-col gap-6 p-6 rounded-3xl border border-border/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-emerald-500/5">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">Student Onboarding</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Discover how to navigate your assignments, view progress, and adapt learning content to your style.
              </p>
            </div>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border/50 bg-zinc-900 shadow-inner">
              <iframe 
                src="https://www.youtube.com/embed/Bq2HLpcp5Zk" 
                title="Student Onboarding Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}