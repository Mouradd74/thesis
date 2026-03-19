import { createClient } from '@/utils/supabase/server'
import { enrollStudent, updateMetrics } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentManagement() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: subjects } = await supabase.from('subjects').select('id, title').eq('teacher_id', user?.id)
  const { data: allStudents } = await supabase.from('profiles').select('id, full_name').eq('role', 'student')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      motivation_score,
      attendance_rate,
      profiles ( id, full_name ),
      subjects ( title )
    `)

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Student Roster</h1>
        <p className="mt-2 text-muted-foreground">Enroll students and manage their behavioral metrics adaptively.</p>
      </div>

      <Card className="bg-zinc-950/40 border-border/50">
        <CardHeader>
          <CardTitle>Enroll a Student</CardTitle>
          <CardDescription>Grant a student explicit access to a curriculum structure.</CardDescription>
        </CardHeader>
        <CardContent>
          {subjects && subjects.length > 0 ? (
            <form action={enrollStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="student_id">Select Student</Label>
                <select id="student_id" name="student_id" required className="flex h-10 w-full rounded-xl border border-input bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-shadow">
                  {allStudents?.map(s => <option key={s.id} value={s.id}>Student #{s.id.substring(0,8)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject_id">Select Subject</Label>
                <select id="subject_id" name="subject_id" required className="flex h-10 w-full rounded-xl border border-input bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-shadow">
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full">Enroll Student</Button>
            </form>
          ) : (
             <div className="flex h-[100px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30 w-full">
               <p className="text-sm text-muted-foreground">Please publish a Subject under the Curriculum tab before enrolling students.</p>
             </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <h2 className="text-xl font-semibold tracking-tight mb-4">Live Enrollments</h2>
        <div className="grid gap-4">
          {enrollments?.map(e => (
            <Card key={e.id} className="bg-zinc-950/40 border-white/5 py-2 px-1">
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 py-4">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                  <h3 className="font-semibold tracking-tight text-foreground">
                    {/* @ts-ignore */}
                    Student #{e.profiles?.id?.substring(0,8) || ''}
                  </h3>
                  {/* @ts-ignore */}
                  <span className="text-sm text-muted-foreground">Course: {e.subjects?.title}</span>
                </div>

                <form action={updateMetrics} className="flex flex-wrap gap-4 items-end w-full md:w-auto">
                  <input type="hidden" name="enrollment_id" value={e.id} />
                  <div className="space-y-2">
                    <Label className="text-[10px]">Motivation (1-10)</Label>
                    <Input type="number" name="motivation_score" min="1" max="10" defaultValue={e.motivation_score || 5} className="w-24 bg-zinc-900 border-white/5 h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px]">Attendance (%)</Label>
                    <Input type="number" name="attendance_rate" min="0" max="100" defaultValue={e.attendance_rate || 100} className="w-24 bg-zinc-900 border-white/5 h-9" />
                  </div>
                  <Button variant="secondary" className="h-9 px-6 bg-zinc-800 hover:bg-zinc-700">Save</Button>
                </form>
              </CardContent>
            </Card>
          ))}
          {(!enrollments || enrollments.length === 0) && (
             <div className="flex h-[150px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-zinc-950/30">
               <p className="text-sm text-muted-foreground">No students actively enrolled in your subjects.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
