import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Trash, Save } from 'lucide-react'
import Link from 'next/link'
import { updateSubject, deleteSubject, updateContent, deleteContent, createContent } from '../actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    subjectId: string
  }>
}

export default async function SubjectManagementPage(props: PageProps) {
  const { subjectId } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .eq('teacher_id', user?.id || '')
    .single()

  if (!subject) return notFound()

  const { data: contents } = await supabase
    .from('content')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/teacher/content" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{subject.title}</h1>
          <p className="mt-1 text-muted-foreground">Manage details and lesson plan layers.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Subject Settings */}
        <Card className="bg-zinc-950/40 border-border/50">
          <CardHeader>
             <CardTitle>Subject Settings</CardTitle>
             <CardDescription>Update name and scope, or delete entirely.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <form action={updateSubject} className="flex flex-col gap-4">
              <input type="hidden" name="subject_id" value={subject.id} />
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={subject.title} required className="bg-zinc-900 border-white/5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea id="description" name="description" defaultValue={subject.description} rows={3} className="flex w-full rounded-xl border border-input bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none transition-shadow" />
              </div>
              <Button type="submit" className="w-full gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
            </form>

            <form action={deleteSubject}>
              <input type="hidden" name="subject_id" value={subject.id} />
              <Button type="submit" variant="destructive" className="w-full gap-2">
                <Trash className="h-4 w-4" /> Delete Subject
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Add Content to Subject */}
        <Card className="bg-zinc-950/40 border-border/50">
          <CardHeader>
            <CardTitle>Add New Layer</CardTitle>
            <CardDescription>Add video, audio, or text segments.</CardDescription>
          </CardHeader>
          <CardContent>
             <form action={createContent} className="flex flex-col gap-4">
                <input type="hidden" name="subject_id" value={subject.id} />
                <div className="space-y-2">
                  <Label htmlFor="content_title">Section Title</Label>
                  <Input id="content_title" name="title" required placeholder="Lecture 2..." className="bg-zinc-900 border-white/5" />
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
                <Button type="submit" variant="secondary" className="w-full mt-2">Add Content</Button>
              </form>
          </CardContent>
        </Card>
      </div>

      {/* Content Outline */}
      <div className="mt-4">
        <h2 className="text-xl font-semibold tracking-tight mb-4">Content Layers</h2>
        <div className="flex flex-col gap-4">
          {contents?.map(content => (
            <Card key={content.id} className="bg-zinc-950/40 border-white/5 shadow-sm">
               <CardContent className="p-4 sm:p-6">
                 <form action={updateContent} className="flex flex-col gap-4">
                   <input type="hidden" name="subject_id" value={subject.id} />
                   <input type="hidden" name="content_id" value={content.id} />
                   
                   <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
                      
                      <div className="flex-1 w-full space-y-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${content.type === 'video' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : content.type === 'audio' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {content.type}
                          </span>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Title</Label>
                            <Input name="title" defaultValue={content.title} className="h-9 bg-zinc-900 border-white/5" />
                          </div>
                          {(content.type === 'video' || content.type === 'audio') && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Resource URL</Label>
                              <Input name="url" defaultValue={content.url || ''} className="h-9 bg-zinc-900 border-white/5" />
                            </div>
                          )}
                        </div>

                        {content.type === 'text' && (
                          <div className="space-y-1.5 mt-2">
                             <Label className="text-xs text-muted-foreground">Text Body</Label>
                             <textarea name="body" defaultValue={content.body || ''} rows={4} className="flex w-full rounded-md border border-input bg-zinc-900 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none border-white/5" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/5 sm:border-0 justify-end">
                         <Button size="sm" type="submit" variant="secondary" className="w-full sm:w-auto h-9"><Save className="h-3.5 w-3.5 mr-2" /> Save</Button>
                         <Button size="sm" type="submit" formAction={deleteContent} variant="destructive" className="w-full sm:w-auto h-9 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"><Trash className="h-3.5 w-3.5 mr-2" /> Delete</Button>
                      </div>

                   </div>
                 </form>
               </CardContent>
            </Card>
          ))}
          {(!contents || contents.length === 0) && (
            <div className="flex h-[120px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
              <p className="text-sm text-muted-foreground">No layers uploaded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
