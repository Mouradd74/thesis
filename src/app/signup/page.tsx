import { signup } from './actions'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'
import { Layers } from 'lucide-react'

export default async function SignupPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] py-12">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80">
        <Layers className="h-5 w-5" />
        EduPlatform
      </Link>
      
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col space-y-2 text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">Join as a student or faculty member</p>
        </div>

        <Card className="border-border/50 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
          <form action={signup}>
            <CardContent className="pt-6">
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" name="full_name" type="text" placeholder="John Doe" required className="bg-zinc-950/50" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-zinc-950/50" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required className="bg-zinc-950/50" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select id="role" name="role" required className="flex h-10 w-full rounded-xl border border-input bg-zinc-950/50 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-shadow">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher (Faculty)</option>
                  </select>
                </div>
                
                {error && (
                  <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                    {error}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-6">
              <SubmitButton className="w-full h-11">Complete Setup</SubmitButton>
              <div className="text-sm text-center text-muted-foreground">
                Already registered?{' '}
                <Link href="/login" className="text-foreground hover:underline underline-offset-4">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
