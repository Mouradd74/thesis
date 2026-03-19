import { createClient } from '@/utils/supabase/server'
import { createSubject, createContent } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ContentManagement() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: subjects, error } = await supabase.from('subjects').select('*').eq('teacher_id', user?.id || '')
  if (error) console.error('Subjects fetch error:', JSON.stringify(error, null, 2))

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Curriculum</h1>
        <p className="mt-2 text-muted-foreground">Manage your subjects and adapt viewing materials.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        
        {/* Create Subject */}
        <Card className="bg-zinc-950/40 border-border/50">
          <CardHeader>
            <CardTitle>New Subject</CardTitle>
            <CardDescription>Create a new baseline course wrapper.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createSubject} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Subject Title</Label>
                <Input id="title" name="title" required placeholder="Advanced Mathematics" className="bg-zinc-900 border-white/5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea id="description" name="description" rows={3} className="flex w-full rounded-xl border border-input bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none transition-shadow" placeholder="Provide a brief overview..." />
              </div>
              <Button type="submit" className="w-full mt-2">Publish Subject</Button>
            </form>
          </CardContent>
        </Card>

        {/* Add Content */}
        <Card className="bg-zinc-950/40 border-border/50">
          <CardHeader>
            <CardTitle>Add Material</CardTitle>
            <CardDescription>Upload adaptive content layers directly.</CardDescription>
          </CardHeader>
          <CardContent>
            {subjects && subjects.length > 0 ? (
              <form action={createContent} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject_id">Select Subject</Label>
                  <select id="subject_id" name="subject_id" required className="flex h-10 w-full rounded-xl border border-input bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-shadow">
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content_title">Material Title</Label>
                  <Input id="content_title" name="title" required placeholder="Lecture 1 Overview" className="bg-zinc-900 border-white/5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Format Type</Label>
                  <select id="type" name="type" required className="flex h-10 w-full rounded-xl border border-input bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-shadow">
                    <option value="video">Video URL</option>
                    <option value="text">Rich Text</option>
                    <option value="audio">Audio Snippet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Resource URL (Optional)</Label>
                  <Input id="url" name="url" placeholder="https://..." className="bg-zinc-900 border-white/5" />
                </div>
                <Button type="submit" variant="secondary" className="w-full mt-2">Upload Material</Button>
              </form>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
                <p className="text-sm text-muted-foreground">Create a subject first to enable uploads.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight mb-4">Active Subjects</h2>
        <div className="flex flex-col gap-3">
          {subjects?.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-950/40 p-4 transition-colors hover:bg-zinc-900/50">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{s.title}</span>
                <span className="text-sm text-muted-foreground">{s.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live</span>
              </div>
            </div>
          ))}
          {(!subjects || subjects.length === 0) && (
             <div className="flex h-[100px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
               <p className="text-sm text-muted-foreground">No subjects broadcasted yet.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
